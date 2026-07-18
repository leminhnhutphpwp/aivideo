<?php

namespace App\Console\Commands;

use App\Services\SkillAuthoringService;
use App\Services\SkillDiscoveryService;
use App\Services\SkillService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

/**
 * Trend-driven self-authoring: for each multi-skill category, web-searches
 * current style trends, asks the LLM which trending styles are missing, and
 * authors the gaps as DRAFT skills (via SkillAuthoringService, which forces
 * status=draft + validates). Capped per category so the catalog never balloons.
 *
 * Everything is fail-open — a missing search/LLM config or a per-gap authoring
 * error is logged and skipped, never fatal. Manual run:
 *   php artisan skills:discover [--max=2] [--dry-run] [--category=video-direction]
 */
class DiscoverSkills extends Command
{
    protected $signature = 'skills:discover
        {--max=2 : Max new drafts to author per category per run}
        {--category= : Limit to a single category (image-direction|video-direction)}
        {--dry-run : Report gaps without authoring any draft}';

    protected $description = 'Discover trending styles missing from the skill catalog and author them as drafts';

    /** Categories eligible for auto-discovery (multi-skill visual style groups). */
    private const TARGET_CATEGORIES = ['image-direction', 'video-direction'];

    public function handle(
        SkillService $skills,
        SkillDiscoveryService $discovery,
        SkillAuthoringService $authoring,
    ): int {
        $maxPerCategory = max(0, (int) $this->option('max'));
        $dryRun = (bool) $this->option('dry-run');

        $categories = array_values(array_intersect(
            self::TARGET_CATEGORIES,
            $skills->multiCategories(),
        ));

        if ($only = $this->option('category')) {
            $categories = array_values(array_intersect($categories, [$only]));
            if ($categories === []) {
                $this->error("Category không hợp lệ cho discovery: {$only}");

                return self::SUCCESS;
            }
        }

        $totalCreated = 0;

        foreach ($categories as $category) {
            $this->line("── {$category} ──");
            try {
                $totalCreated += $this->discoverCategory($category, $maxPerCategory, $dryRun, $skills, $discovery, $authoring);
            } catch (\Throwable $e) {
                // Fail-open per category so one bad category can't stop the rest.
                Log::warning('skills:discover: category failed', ['category' => $category, 'error' => $e->getMessage()]);
                $this->warn("  Bỏ qua {$category}: {$e->getMessage()}");
            }
        }

        $verb = $dryRun ? 'sẽ tạo' : 'đã tạo';
        $this->info("Hoàn tất. {$verb} {$totalCreated} skill draft.");

        return self::SUCCESS;
    }

    private function discoverCategory(
        string $category,
        int $maxPerCategory,
        bool $dryRun,
        SkillService $skills,
        SkillDiscoveryService $discovery,
        SkillAuthoringService $authoring,
    ): int {
        // Existing labels (published + draft) — the dedup baseline.
        $existingLabels = collect($skills->all())
            ->where('category', $category)
            ->pluck('label')
            ->filter()
            ->values()
            ->all();

        $query = 'trending '.str_replace('-', ' ', $category).' styles for short-form AI video and image '.now()->year;
        $trends = $discovery->searchTrends($query);

        $gaps = $discovery->findGaps($category, $existingLabels, $trends, $maxPerCategory);
        if ($gaps === []) {
            $this->line('  Không tìm thấy khoảng trống mới.');

            return 0;
        }

        $created = 0;
        foreach ($gaps as $gap) {
            if ($created >= $maxPerCategory) {
                break;
            }

            if ($discovery->isDuplicateLabel($gap['label'], $existingLabels)) {
                $this->line("  ↷ Bỏ qua (trùng): {$gap['label']}");

                continue;
            }

            if ($dryRun) {
                $this->line("  + (dry-run) {$gap['label']} — {$gap['brief']}");
                $existingLabels[] = $gap['label'];
                $created++;

                continue;
            }

            try {
                $brief = $gap['label'].' — '.$gap['brief'];
                $saved = $authoring->authorDraft($category, $brief);
                $this->info("  ✓ Draft: {$saved['id']} ({$gap['label']})");
                Log::info('skills:discover authored draft', [
                    'category' => $category,
                    'id' => $saved['id'] ?? null,
                    'label' => $gap['label'],
                ]);
                // Prevent authoring a second near-duplicate in the same run.
                $existingLabels[] = $gap['label'];
                $created++;
            } catch (\Throwable $e) {
                // Fail-open per gap.
                Log::warning('skills:discover: authoring failed', [
                    'category' => $category,
                    'label' => $gap['label'],
                    'error' => $e->getMessage(),
                ]);
                $this->warn("  ✗ Lỗi tạo '{$gap['label']}': {$e->getMessage()}");
            }
        }

        return $created;
    }
}
