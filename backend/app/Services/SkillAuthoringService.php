<?php

namespace App\Services;

use App\Support\ErrorSanitizer;
use App\Support\LlmConfigResolver;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Yaml\Yaml;

/**
 * AI-assisted skill authoring. Asks the daemon's LLM to generate a new skill for
 * a category, then saves it as a DRAFT SKILL.md (hidden from the studio until a
 * human reviews and publishes it). Used by both the admin button and the public
 * agent API. Mirrors the plan-capability config via schema().
 */
class SkillAuthoringService
{
    public function __construct(protected SkillService $skills) {}

    /**
     * The authoring "contract" for AI agents: which categories accept new skills,
     * the frontmatter structure (template) of each, and the rules to follow.
     */
    public function schema(): array
    {
        $categories = [];
        foreach ($this->skills->multiCategories() as $c) {
            $categories[$c] = ['frontmatter_template' => $this->skills->template($c)['frontmatter']];
        }

        return [
            'categories' => $categories,
            'rules' => [
                'Mỗi skill là 1 file SKILL.md: frontmatter (YAML) + body (markdown).',
                'Giữ đúng các key theo frontmatter_template của category; điền nội dung mới, chất lượng, bắt trend.',
                'id: kebab-case ngắn; label: tiêu đề ngắn; description: 1 câu súc tích.',
                'Chỉ thêm skill vào các category đa-skill liệt kê ở "categories".',
                'Skill tạo ra mặc định status=draft — cần người duyệt rồi publish mới hiển thị ở studio.',
            ],
        ];
    }

    /**
     * Generate a skill via the daemon LLM and persist it as a draft.
     * Returns the saved draft (parsed). When the daemon ran auto-verify it also
     * returns an optional `sample` (a generated sample image + style-match verdict),
     * which we attach to the draft under the `sample` key so the admin can eyeball
     * the result before publishing. Absent/degraded samples are tolerated — the
     * draft is saved either way. Throws with a sanitized message on failure.
     */
    public function authorDraft(string $category, string $brief, ?string $trendContext = null): array
    {
        if (! in_array($category, $this->skills->multiCategories(), true)) {
            throw new \InvalidArgumentException('Category không hợp lệ — chỉ nhóm đa-skill mới thêm được skill.');
        }

        $resp = Http::timeout(120)->post(
            rtrim(config('daemon.base_url'), '/').'/api/media/skills/author',
            array_filter([
                'category' => $category,
                'brief' => $brief,
                'trendContext' => $trendContext,
                'llm' => LlmConfigResolver::resolve(),          // admin override; null ⇒ daemon uses .env
                'search' => LlmConfigResolver::resolveSearch(), // admin override; null ⇒ daemon uses .env
            ], fn ($v) => $v !== null && $v !== ''),
        );

        if (! $resp->successful()) {
            $raw = $resp->json('error');
            throw new \RuntimeException(ErrorSanitizer::publicMessage(is_string($raw) ? $raw : 'Tạo skill bằng AI thất bại.'));
        }

        $skill = $resp->json('skill');
        if (! is_array($skill) || empty($skill['id'])) {
            throw new \RuntimeException('AI trả về dữ liệu skill không hợp lệ.');
        }

        $name = preg_replace('/[^a-z0-9_-]/', '', strtolower((string) $skill['id']));
        if ($name === '') {
            throw new \RuntimeException('AI trả về id không hợp lệ.');
        }

        $body = (string) ($skill['body'] ?? '');
        unset($skill['body']);
        // Force draft (drop any LLM-provided status first so it can't win) + put it
        // first in the frontmatter. AI skills must always land as draft for review.
        unset($skill['status']);
        $skill = ['status' => 'draft'] + $skill;
        $frontmatter = trim(Yaml::dump($skill, 6, 2));

        // Atomic write + daemon reload via SkillService.
        $draft = $this->skills->save($category.'/'.$name, $frontmatter, $body);

        // Attach the optional auto-verify sample (image + style-match verdict), if the
        // daemon returned one. Optional + degraded-tolerant: a missing sample, a
        // {degraded, error} sample, or a {simulated} sample are all fine — the draft was
        // already saved above and stays valid regardless.
        $sample = $resp->json('sample');
        if (is_array($sample)) {
            // The daemon returns a RELATIVE path; build the full daemon URL so the admin
            // UI can load it like any other daemon-served media.
            if (! empty($sample['imageUrl']) && is_string($sample['imageUrl'])) {
                $sample['imageFullUrl'] = $this->daemonUrl($sample['imageUrl']);
            }
            $draft['sample'] = $sample;
        }

        return $draft;
    }

    /** Build a full daemon URL from a daemon-relative path (e.g. /api/projects/.../raw/x.png). */
    protected function daemonUrl(string $relative): string
    {
        return rtrim((string) config('daemon.base_url'), '/').'/'.ltrim($relative, '/');
    }
}
