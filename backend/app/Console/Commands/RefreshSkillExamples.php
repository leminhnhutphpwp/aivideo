<?php

namespace App\Console\Commands;

use App\Models\RenderJob;
use App\Services\SkillService;
use Illuminate\Console\Command;
use Symfony\Component\Yaml\Yaml;

/**
 * The "learning" step of the self-evolving skill library.
 *
 * For every skill that has accumulated community signal, find the most-liked PUBLISHED
 * asset generated with that skill and rewrite the skill's `example_prompt` toward that
 * real, successful prompt. Examples therefore drift toward what actual users up-voted,
 * instead of staying frozen at whatever the author first wrote.
 *
 * Only skills that already expose an `example_prompt` field (image-direction /
 * video-direction) are touched — single-file doc skills have no example to evolve.
 * Writes go through SkillService::save(), which validates the frontmatter YAML and
 * reloads the daemon cache, so the SKILL.md is never left in a broken state.
 */
class RefreshSkillExamples extends Command
{
    protected $signature = 'skills:refresh-examples
        {--min-likes= : Minimum likes an asset needs before its prompt can become the example (default: config)}
        {--dry-run : Report what would change without writing any SKILL.md}';

    protected $description = 'Evolve skill example prompts from the most-liked community assets that used each skill';

    public function handle(SkillService $skills): int
    {
        $minLikes = (int) ($this->option('min-likes') ?? config('daemon.skill_learning.min_likes', 3));
        $dryRun = (bool) $this->option('dry-run');

        // Source of truth = the assets themselves. Every skill that has at least one
        // published asset attributed to it is a candidate (SkillStat is a cache/ranking
        // aid, not the driver — so learning still works even if stats lag or are reset).
        $skillIds = RenderJob::query()
            ->published()
            ->whereNotNull('skill_id')
            ->distinct()
            ->pluck('skill_id');

        if ($skillIds->isEmpty()) {
            $this->info('No published assets attributed to a skill yet — nothing to refresh.');

            return self::SUCCESS;
        }

        $refreshed = 0;

        foreach ($skillIds as $skillId) {
            $skill = $this->resolveSkill($skills, $skillId);
            if ($skill === null) {
                continue;
            }

            $meta = $this->parseFrontmatter($skill['frontmatter']);
            // Only skills built around an example prompt can "learn" a new one.
            if (! array_key_exists('example_prompt', $meta)) {
                continue;
            }

            $job = $this->bestAssetForSkill($skillId, $minLikes);
            if ($job === null) {
                continue;
            }

            $newPrompt = trim((string) $job->prompt);
            if ($newPrompt === '' || ($meta['example_prompt'] ?? null) === $newPrompt) {
                continue; // nothing usable, or already the current example
            }

            $meta['example_prompt'] = $newPrompt;
            // Provenance so admins can see WHY the example changed (and revert if needed).
            $meta['learned_from_uuid'] = $job->uuid;
            $meta['learned_likes'] = (int) $job->likes_count;
            $meta['learned_at'] = now()->toIso8601String();

            $this->line("• {$skill['id']} ← asset {$job->uuid} ({$job->likes_count} likes)");

            if ($dryRun) {
                $refreshed++;
                continue;
            }

            try {
                $skills->save($skill['id'], Yaml::dump($meta, 6, 2), $skill['body']);
                $refreshed++;
            } catch (\Throwable $e) {
                $this->warn("  ✗ failed to write {$skill['id']}: {$e->getMessage()}");
            }
        }

        $verb = $dryRun ? 'would refresh' : 'refreshed';
        $this->info("Done — {$verb} {$refreshed} skill example(s).");

        return self::SUCCESS;
    }

    /**
     * Most-liked published, completed asset generated with this skill, provided it
     * clears the like threshold. Ties broken by recency.
     */
    protected function bestAssetForSkill(string $skillId, int $minLikes): ?RenderJob
    {
        $job = RenderJob::query()
            ->where('skill_id', $skillId)
            ->published()
            ->withCount('likes')
            ->orderByDesc('likes_count')
            ->orderByDesc('published_at')
            ->first();

        if ($job === null || (int) $job->likes_count < $minLikes) {
            return null;
        }

        return $job;
    }

    /**
     * Map a stored render_jobs.skill_id to an on-disk skill. The studio may store the
     * full SkillService id ("image-direction/natural-photo") or just the leaf name, so
     * try the direct lookup first, then fall back to matching by id / leaf / frontmatter id.
     */
    protected function resolveSkill(SkillService $skills, string $skillId): ?array
    {
        try {
            if ($direct = $skills->get($skillId)) {
                return $direct;
            }
        } catch (\Throwable) {
            // invalid id shape for get() — fall through to the scan
        }

        foreach ($skills->all() as $skill) {
            if ($skill['id'] === $skillId || basename($skill['id']) === $skillId) {
                return $skill;
            }
            $meta = $this->parseFrontmatter($skill['frontmatter']);
            if (($meta['id'] ?? null) === $skillId) {
                return $skill;
            }
        }

        return null;
    }

    /** @return array<string,mixed> */
    protected function parseFrontmatter(string $frontmatter): array
    {
        try {
            $meta = Yaml::parse($frontmatter);

            return is_array($meta) ? $meta : [];
        } catch (\Throwable) {
            return [];
        }
    }
}
