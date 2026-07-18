<?php

namespace App\Services;

use App\Models\CreditSetting;
use FilesystemIterator;
use Illuminate\Support\Facades\Log;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Read-only staleness auditor for the local skill docs. It scans every *.md
 * under the skills root and flags content that has drifted out of sync with the
 * live system:
 *   - MODEL references — tokens that look like a provider/model id (belong to a
 *     tracked vendor family) but are NOT present in config('media_providers').
 *   - PRICING drift — a hardcoded `exchange_rate` literal that disagrees with the
 *     live CreditSetting.
 *
 * It NEVER edits anything — findings are advisory (admin decides). Fail-open:
 * any parse/IO/DB error is logged and skipped rather than thrown, so a scheduled
 * run can't crash.
 */
class SkillStalenessService
{
    /**
     * Vendor stems the platform tracks but that are NOT (currently) in the
     * catalog. A model-id-shaped token starting with one of these that isn't in
     * config('media_providers') is almost certainly an outdated reference (an old
     * provider we dropped, or a competitor model a stale doc still names).
     */
    private const EXTERNAL_VENDOR_STEMS = [
        'seedance', 'kling', 'veo', 'sora', 'runway', 'runwayml', 'luma',
        'haiper', 'pika', 'minimax', 'hailuo', 'hunyuan', 'mochi', 'ltx',
        'gen3', 'gen4', 'dalle', 'midjourney', 'imagen', 'firefly', 'wanx',
    ];

    /**
     * Scan all skill docs and return findings.
     *
     * @return array<int,array{file:string,issues:array<int,string>}>
     */
    public function check(): array
    {
        $root = rtrim((string) config('daemon.skills_path', '/skills'), '/');
        if (! is_dir($root)) {
            Log::warning('SkillStaleness: skills root not found', ['root' => $root]);

            return [];
        }

        [$catalogIds, $catalogStems] = $this->catalog();
        $tracked = $catalogStems + array_fill_keys(self::EXTERNAL_VENDOR_STEMS, true);

        $findings = [];

        try {
            $rii = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
            );
        } catch (\Throwable $e) {
            Log::warning('SkillStaleness: failed to iterate skills root', ['error' => $e->getMessage()]);

            return [];
        }

        foreach ($rii as $file) {
            if (! $file->isFile() || strtolower($file->getExtension()) !== 'md') {
                continue;
            }

            $text = @file_get_contents($file->getPathname());
            if ($text === false || $text === '') {
                continue;
            }

            $issues = array_merge(
                $this->scanModels($text, $catalogIds, $tracked),
                $this->scanPricing($text),
            );

            if ($issues !== []) {
                $rel = ltrim(str_replace($root, '', $file->getPathname()), '/');
                $findings[] = ['file' => $rel, 'issues' => $issues];
            }
        }

        usort($findings, fn ($a, $b) => strcmp($a['file'], $b['file']));

        return $findings;
    }

    /**
     * Build the catalog membership set + the set of "tracked" vendor stems from
     * config('media_providers'): every provider id, every model id, every model's
     * leading alpha stem, and every default-model id.
     *
     * @return array{0:array<int,string>,1:array<string,true>}
     */
    private function catalog(): array
    {
        $ids = [];
        $stems = [];

        foreach ((array) config('media_providers.providers', []) as $providerId => $provider) {
            $pid = strtolower((string) $providerId);
            if ($pid !== '') {
                $stems[$pid] = true;
                // A provider id is also a legitimate reference (e.g. the prose
                // "OpenAI-compatible") — treat it as known so descriptive
                // mentions of a real provider aren't flagged.
                $ids[$pid] = true;
            }
            foreach ((array) ($provider['models'] ?? []) as $modelId => $_) {
                $mid = strtolower((string) $modelId);
                if ($mid === '') {
                    continue;
                }
                $ids[$mid] = true;
                if (preg_match('/^[a-z]+/', $mid, $m)) {
                    $stems[$m[0]] = true;
                }
            }
        }

        foreach ((array) config('media_providers.default_models', []) as $modelId) {
            $mid = strtolower((string) $modelId);
            if ($mid !== '') {
                $ids[$mid] = true;
            }
        }

        return [array_keys($ids), $stems];
    }

    /**
     * Flag model-id-shaped tokens whose vendor stem is tracked but that are not
     * present in the catalog. Uses a lenient two-way substring match so partial
     * mentions (e.g. "wan2.6" for the family, "qwen-image" as a prefix) are
     * treated as known and never false-flagged.
     *
     * @param  array<int,string>  $catalogIds
     * @param  array<string,true>  $tracked
     * @return array<int,string>
     */
    private function scanModels(string $text, array $catalogIds, array $tracked): array
    {
        // model-id shape: starts alpha, then one or more dot/dash separated
        // alphanumeric groups. Slash is deliberately NOT a separator so that
        // "wan2.6/2.7" splits into "wan2.6" + "2.7" (the latter starts with a
        // digit and is ignored).
        if (! preg_match_all('/[a-z][a-z0-9]*(?:[.\-][a-z0-9]+)+/', strtolower($text), $m)) {
            return [];
        }

        $issues = [];
        $seen = [];

        foreach (array_unique($m[0]) as $token) {
            if (! preg_match('/^[a-z]+/', $token, $stemMatch)) {
                continue;
            }
            $stem = $stemMatch[0];
            if (! isset($tracked[$stem])) {
                continue; // not a token from a family we track — ignore
            }
            if ($this->isKnownModel($token, $catalogIds)) {
                continue;
            }
            if (isset($seen[$token])) {
                continue;
            }
            $seen[$token] = true;
            $issues[] = "Tham chiếu model không có trong catalog: '{$token}' (kiểm tra config/media_providers.php)";
        }

        return $issues;
    }

    /**
     * A token is "known" if it equals a catalog id, or shares a substring
     * relationship either way with one (covers family prefixes like "wan2.6" and
     * un-prefixed variants).
     *
     * @param  array<int,string>  $catalogIds
     */
    private function isKnownModel(string $token, array $catalogIds): bool
    {
        foreach ($catalogIds as $id) {
            if ($token === $id || str_contains($id, $token) || str_contains($token, $id)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Optional pricing-drift check: if a doc hardcodes an `exchange_rate` numeric
     * literal, compare it to the live CreditSetting. Best-effort — skipped if the
     * value can't be parsed or the setting can't be read.
     *
     * @return array<int,string>
     */
    private function scanPricing(string $text): array
    {
        if (! preg_match('/exchange_rate\s*[=:]\s*([0-9]*\.?[0-9]+)/i', $text, $m)) {
            return [];
        }

        $docRate = (float) $m[1];

        try {
            $liveRate = CreditSetting::exchangeRate();
        } catch (\Throwable $e) {
            Log::warning('SkillStaleness: could not read live exchange rate', ['error' => $e->getMessage()]);

            return [];
        }

        if (abs($docRate - $liveRate) > 1e-9) {
            return [
                "Pricing drift: exchange_rate trong tài liệu = {$docRate} nhưng hệ thống (CreditSetting) = {$liveRate}",
            ];
        }

        return [];
    }
}
