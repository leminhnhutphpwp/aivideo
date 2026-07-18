<?php

namespace App\Services;

use FilesystemIterator;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use Symfony\Component\Yaml\Yaml;

/**
 * Manages the local skill files (apps/skills/<category>/[<name>/]SKILL.md),
 * mounted into this container at config('daemon.skills_path'). Provides full
 * CRUD over the raw frontmatter (YAML) + markdown body, and invalidates the
 * daemon's in-memory skills cache after every write so changes take effect
 * without a daemon restart.
 */
class SkillService
{
    /**
     * Category-paths the daemon actually loads, and how (mirrors apps/daemon
     * src/skills/loader.ts). 'multi' = collection of named sub-skills (you can
     * add new ones); 'single' = exactly one SKILL.md (edit-only — the daemon
     * ignores sub-folders). Any category on disk NOT listed here is dormant:
     * the daemon never loads it, so editing/adding does nothing.
     */
    public const DAEMON_CATEGORIES = [
        'image-direction' => 'multi',
        'video-direction' => 'multi',
        'video-storyboard/types' => 'multi',
        'video-contract' => 'single',
        'video-discovery' => 'single',
        'video-compose' => 'single',
        'video-storyboard' => 'single',
        'video-marketing-psychology' => 'single',
    ];

    /**
     * Minimum frontmatter keys a skill MUST carry to be usable by the daemon
     * loader, keyed by collection (see collectionFor()). A skill saved without
     * one of these is broken-but-silent (empty style, no prompt template), so
     * save() rejects it up front — for AI authoring AND manual admin edits.
     *
     * These are the *core* usable-skill fields, not the full frontmatter schema:
     * a skill can carry more keys, but never fewer than these.
     */
    public const REQUIRED_KEYS = [
        'image-direction' => [
            'id', 'label', 'label_en', 'description',
            'example_prompt', 'example_prompt_vi',
            'style_keywords', 'prompt_template', 'default_negative',
        ],
        'video-direction' => [
            'id', 'label', 'label_en',
            'camera_presets', 'lighting_presets', 'mood_tones',
            'style_keywords', 'prompt_template',
            'example_prompt', 'example_prompt_vi',
        ],
        'video-storyboard/types' => [
            'capability', 'style_keywords', 'prompt_template',
        ],
    ];

    protected string $root;

    public function __construct()
    {
        $this->root = rtrim(config('daemon.skills_path', '/skills'), '/');
    }

    /** All skills, sorted by id. */
    public function all(): array
    {
        if (! is_dir($this->root)) {
            return [];
        }

        $skills = [];
        $rii = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($this->root, FilesystemIterator::SKIP_DOTS)
        );
        foreach ($rii as $file) {
            if ($file->getFilename() === 'SKILL.md') {
                $skills[] = $this->parse($file->getPathname());
            }
        }

        usort($skills, fn ($a, $b) => strcmp($a['id'], $b['id']));

        return $skills;
    }

    /** Top-level category directories under the skills root, e.g. image-direction, video-contract. */
    public function categories(): array
    {
        if (! is_dir($this->root)) {
            return [];
        }

        $dirs = array_filter(
            scandir($this->root) ?: [],
            fn ($e) => $e !== '.' && $e !== '..' && is_dir($this->root.'/'.$e),
        );
        sort($dirs);

        return array_values($dirs);
    }

    /**
     * A category is "multi-skill" when its skills live in named sub-folders
     * (<category>/<name>/SKILL.md) — e.g. image-direction, video-direction — so a
     * new skill needs a name. Single-file categories (<category>/SKILL.md) hold
     * exactly one skill.
     */
    public function isMultiSkill(string $category): bool
    {
        $category = $this->sanitizeId($category);
        foreach (glob($this->root.'/'.$category.'/*', GLOB_ONLYDIR) ?: [] as $sub) {
            if (is_file($sub.'/SKILL.md')) {
                return true;
            }
        }

        return false;
    }

    /**
     * A starter frontmatter + body for a category, derived from an existing skill
     * in it so the editor shows the correct fields. id/label/description are
     * cleared for the user to fill.
     *
     * @return array{frontmatter:string,body:string}
     */
    public function template(string $category): array
    {
        $sample = collect($this->all())->firstWhere('category', $category);

        if (! $sample) {
            return [
                'frontmatter' => "status: draft\nid:\nlabel:\ndescription:",
                'body' => "# Tiêu đề\n\nMô tả / hướng dẫn ở đây.",
            ];
        }

        $meta = [];
        try {
            $meta = Yaml::parse($sample['frontmatter']) ?: [];
        } catch (\Throwable) {
        }
        foreach (['id', 'label', 'description'] as $k) {
            if (array_key_exists($k, $meta)) {
                $meta[$k] = '';
            }
        }
        // New skills start as draft — hidden from the studio until published.
        $meta = ['status' => 'draft'] + $meta;

        return [
            'frontmatter' => trim(Yaml::dump($meta, 6, 2)),
            'body' => "# ".ucfirst(str_replace('-', ' ', $category))."\n\nMô tả phong cách / hướng dẫn ở đây.",
        ];
    }

    /** A single skill by id (relative path), or null if missing. */
    public function get(string $id): ?array
    {
        $file = $this->fileFor($id);

        return is_file($file) ? $this->parse($file) : null;
    }

    /**
     * Flip a skill's published/draft status. Targets only the `status:` line so
     * the rest of the frontmatter formatting is preserved.
     */
    public function setStatus(string $id, string $status): array
    {
        $status = $status === 'draft' ? 'draft' : 'published';

        $skill = $this->get($id);
        if (! $skill) {
            throw new \InvalidArgumentException('Skill không tồn tại: '.$id);
        }

        $fm = $skill['frontmatter'];
        if (preg_match('/^status:\s*.*$/m', $fm)) {
            $fm = preg_replace('/^status:\s*.*$/m', "status: {$status}", $fm);
        } else {
            $fm = "status: {$status}\n".$fm;
        }

        return $this->save($id, $fm, $skill['body']);
    }

    /**
     * Create or overwrite a skill. $frontmatter is raw YAML text, $body is raw
     * markdown. Writes atomically and reloads the daemon cache.
     */
    public function save(string $id, string $frontmatter, string $body): array
    {
        $id = $this->sanitizeId($id);

        // Validate the frontmatter is parseable YAML so we never write a file
        // that breaks the daemon's loader.
        try {
            $meta = Yaml::parse($frontmatter);
        } catch (\Throwable $e) {
            throw new \InvalidArgumentException('Frontmatter YAML không hợp lệ: '.$e->getMessage());
        }

        // Reject skills missing the core keys their category needs to be usable
        // (empty style / no prompt template = a silently-broken skill).
        $this->validateRequiredKeys($id, is_array($meta) ? $meta : []);

        $content = "---\n".trim($frontmatter)."\n---\n".trim($body)."\n";

        $file = $this->fileFor($id);
        $dir = dirname($file);
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        // Atomic write: temp file + rename, so the daemon never reads a half-written file.
        $tmp = $file.'.tmp';
        file_put_contents($tmp, $content);
        rename($tmp, $file);

        $this->reloadDaemon();

        return $this->parse($file);
    }

    /**
     * Enforce the category's REQUIRED_KEYS on a parsed frontmatter map. Throws
     * with the list of missing keys so the admin/AI knows exactly what to add.
     * A key counts as missing when absent, null, empty string, or empty array.
     * Categories without a REQUIRED_KEYS entry (single-file docs) are unchecked.
     *
     * @param  array<string,mixed>  $meta
     */
    protected function validateRequiredKeys(string $id, array $meta): void
    {
        ['collection' => $collection] = $this->collectionFor($id);

        $required = self::REQUIRED_KEYS[$collection] ?? [];
        if ($required === []) {
            return;
        }

        $missing = [];
        foreach ($required as $key) {
            $val = $meta[$key] ?? null;
            if ($val === null || $val === '' || $val === []) {
                $missing[] = $key;
            }
        }

        if ($missing !== []) {
            throw new \InvalidArgumentException(
                'Skill thiếu trường bắt buộc cho nhóm "'.$collection.'": '.implode(', ', $missing)
                .'. Vui lòng bổ sung đầy đủ trước khi lưu.'
            );
        }
    }

    /** Delete a skill (and its now-empty directory) and reload the daemon cache. */
    public function delete(string $id): void
    {
        $id = $this->sanitizeId($id);
        $file = $this->fileFor($id);

        if (is_file($file)) {
            unlink($file);
            @rmdir(dirname($file));
        }

        $this->reloadDaemon();
    }

    /** Tell the daemon to drop its in-memory skills cache. Best-effort. */
    public function reloadDaemon(): void
    {
        try {
            Http::timeout(5)->post(rtrim(config('daemon.base_url'), '/').'/api/media/skills/reload');
        } catch (\Throwable $e) {
            Log::warning('SkillService: daemon reload failed', ['error' => $e->getMessage()]);
        }
    }

    protected function parse(string $file): array
    {
        $raw = file_get_contents($file) ?: '';
        [$frontmatter, $body] = $this->split($raw);

        $meta = [];
        try {
            $meta = Yaml::parse($frontmatter) ?: [];
        } catch (\Throwable) {
            // keep raw frontmatter editable even if it doesn't currently parse
        }

        $id = $this->idFromPath($file);
        ['collection' => $collection, 'type' => $type] = $this->collectionFor($id);

        return [
            'id' => $id,
            'category' => explode('/', $id)[0],
            'collection' => $collection,
            'type' => $type,
            'status' => ($meta['status'] ?? 'published') === 'draft' ? 'draft' : 'published',
            'label' => $meta['label'] ?? $meta['label_en'] ?? $meta['id'] ?? basename(dirname($file)),
            'description' => $meta['description'] ?? '',
            'frontmatter' => trim($frontmatter),
            'body' => trim($body),
            'path' => $file,
        ];
    }

    /**
     * Resolve which daemon collection a skill id belongs to, and its type.
     * Longest registered prefix wins (so video-storyboard/types/x → the multi
     * 'video-storyboard/types', not the single 'video-storyboard').
     *
     * @return array{collection:string,type:string} type ∈ multi|single|unloaded
     */
    public function collectionFor(string $id): array
    {
        $best = null;
        foreach (array_keys(self::DAEMON_CATEGORIES) as $cat) {
            if ($id === $cat || str_starts_with($id.'/', $cat.'/')) {
                if ($best === null || strlen($cat) > strlen($best)) {
                    $best = $cat;
                }
            }
        }

        if ($best !== null) {
            return ['collection' => $best, 'type' => self::DAEMON_CATEGORIES[$best]];
        }

        return ['collection' => explode('/', $id)[0], 'type' => 'unloaded'];
    }

    /** Registered multi-skill collections (the only ones you can add new skills to). */
    public function multiCategories(): array
    {
        return array_keys(array_filter(self::DAEMON_CATEGORIES, fn ($t) => $t === 'multi'));
    }

    /** @return array{0:string,1:string} [frontmatter, body] */
    protected function split(string $raw): array
    {
        if (preg_match('/^---\s*\n(.*?)\n---\s*\n(.*)$/s', $raw, $m)) {
            return [$m[1], $m[2]];
        }

        return ['', $raw];
    }

    /** Relative dir of a SKILL.md from the skills root, e.g. "image-direction/natural-photo". */
    protected function idFromPath(string $file): string
    {
        return ltrim(str_replace($this->root, '', dirname($file)), '/');
    }

    protected function fileFor(string $id): string
    {
        return $this->root.'/'.$this->sanitizeId($id).'/SKILL.md';
    }

    /** Guard against path traversal / invalid ids. */
    protected function sanitizeId(string $id): string
    {
        $id = trim($id, '/');
        if ($id === '' || str_contains($id, '..') || ! preg_match('#^[A-Za-z0-9/_-]+$#', $id)) {
            throw new \InvalidArgumentException('ID skill không hợp lệ (chỉ chữ/số/-/_/ và không chứa "..").');
        }

        return $id;
    }
}
