<?php

namespace App\Services;

use App\Models\SkillStat;
use Illuminate\Support\Facades\Log;

/**
 * Rolls real community activity up into per-skill counters (SkillStat). Every write
 * is wrapped so a stats failure can NEVER break the render / publish / like flow it
 * hangs off — the learning loop is best-effort telemetry, not a critical path.
 *
 * Attribution key: the skill id used by SkillService (e.g. "image-direction/natural-photo"),
 * stored on render_jobs.skill_id at generation time.
 */
class SkillStatsService
{
    /** Count one generation against a skill and stamp last_used_at. */
    public function recordUsage(?string $skillId, ?string $category = null): void
    {
        $this->safely(function () use ($skillId, $category) {
            $skillId = $this->normalize($skillId);
            if ($skillId === null) {
                return;
            }

            $stat = SkillStat::firstOrCreate(
                ['skill_id' => $skillId],
                ['category' => $category ?? $this->categoryOf($skillId)],
            );

            // increment() issues a single atomic UPDATE and lets us stamp last_used_at
            // in the same statement.
            $stat->increment('usage_count', 1, ['last_used_at' => now()]);
        });
    }

    /** Count one publish-to-community against a skill. */
    public function recordPublish(?string $skillId): void
    {
        $this->safely(function () use ($skillId) {
            $skillId = $this->normalize($skillId);
            if ($skillId === null) {
                return;
            }

            $stat = SkillStat::firstOrCreate(
                ['skill_id' => $skillId],
                ['category' => $this->categoryOf($skillId)],
            );

            $stat->increment('published_count');
        });
    }

    /**
     * Apply a like delta (+1 on like, -1 on unlike) to a skill, clamped at 0 so an
     * unlike never drives the counter negative.
     */
    public function recordLike(?string $skillId, int $delta): void
    {
        $this->safely(function () use ($skillId, $delta) {
            $skillId = $this->normalize($skillId);
            if ($skillId === null || $delta === 0) {
                return;
            }

            if ($delta > 0) {
                $stat = SkillStat::firstOrCreate(
                    ['skill_id' => $skillId],
                    ['category' => $this->categoryOf($skillId)],
                );
                $stat->increment('likes_count', $delta);

                return;
            }

            // Unlike: decrement atomically only when it stays >= 0 (no negative counts,
            // and no phantom row created for an unlike of an unattributed job).
            SkillStat::where('skill_id', $skillId)
                ->where('likes_count', '>=', abs($delta))
                ->decrement('likes_count', abs($delta));
        });
    }

    /**
     * Stats for a set of skill ids, keyed by skill_id. Missing skills are absent
     * (caller treats them as all-zero). Used by the studio ranking endpoint so the
     * frontend can sort popular skills first.
     *
     * @param  array<int,string>  $skillIds
     * @return array<string, array<string,mixed>>
     */
    public function statsFor(array $skillIds = []): array
    {
        $query = SkillStat::query();
        if ($skillIds !== []) {
            $query->whereIn('skill_id', $skillIds);
        }

        return $query->get()
            ->keyBy('skill_id')
            ->map(fn (SkillStat $s) => [
                'skill_id' => $s->skill_id,
                'category' => $s->category,
                'usage_count' => (int) $s->usage_count,
                'published_count' => (int) $s->published_count,
                'likes_count' => (int) $s->likes_count,
                'last_used_at' => $s->last_used_at?->toIso8601String(),
            ])
            ->all();
    }

    /** First path segment as the skill's category ("image-direction/x" → "image-direction"). */
    protected function categoryOf(string $skillId): string
    {
        return explode('/', $skillId)[0];
    }

    /** Trim + reject empty / sentinel ("none") skill ids. */
    protected function normalize(?string $skillId): ?string
    {
        if ($skillId === null) {
            return null;
        }
        $skillId = trim($skillId);

        return ($skillId === '' || $skillId === 'none') ? null : $skillId;
    }

    /** Run a stats mutation, swallowing (and logging) any failure. */
    protected function safely(callable $fn): void
    {
        try {
            $fn();
        } catch (\Throwable $e) {
            Log::warning('SkillStatsService write failed', ['error' => $e->getMessage()]);
        }
    }
}
