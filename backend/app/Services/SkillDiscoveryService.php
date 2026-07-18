<?php

namespace App\Services;

use App\Support\LlmConfigResolver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Trend-driven skill discovery. For a multi-skill category it:
 *   1. web-searches (Tavily) for currently-trending styles,
 *   2. asks the admin-configured LLM which trending styles are MISSING from the
 *      existing skill labels (the "gaps"),
 * returning a short list of gap suggestions. Authoring the actual draft skills is
 * left to SkillAuthoringService (see DiscoverSkills command).
 *
 * Every external call is fail-open: no search/LLM configured, a network error, or
 * malformed output all degrade to an empty result and a log line — never a throw,
 * so a scheduled run can't crash the scheduler.
 */
class SkillDiscoveryService
{
    /**
     * Tavily web search via the backend (uses the admin AiSettings search key).
     * Returns [] when no Tavily key is configured or on any error.
     *
     * @return array<int,array{title:string,snippet:string}>
     */
    public function searchTrends(string $query, int $maxResults = 5): array
    {
        $search = LlmConfigResolver::resolveSearch();
        if (! is_array($search) || ($search['provider'] ?? null) !== 'tavily' || empty($search['apiKey'])) {
            Log::info('SkillDiscovery: no Tavily key configured, skipping web trend search');

            return [];
        }

        try {
            $resp = Http::timeout(20)->post('https://api.tavily.com/search', [
                'api_key' => $search['apiKey'],
                'query' => $query,
                'max_results' => $maxResults,
                'search_depth' => 'basic',
            ]);

            if (! $resp->successful()) {
                return [];
            }

            return collect($resp->json('results', []))
                ->map(fn ($r) => [
                    'title' => (string) ($r['title'] ?? ''),
                    'snippet' => (string) ($r['content'] ?? ''),
                ])
                ->filter(fn ($r) => $r['title'] !== '' || $r['snippet'] !== '')
                ->values()
                ->all();
        } catch (\Throwable $e) {
            Log::warning('SkillDiscovery: web trend search failed', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Ask the LLM which trending styles are missing from $existingLabels. Returns
     * a list of candidate gaps as [{label, brief}] — deliberately a few MORE than
     * $max so the caller has room to skip duplicates and still author up to $max.
     * Fail-open to [] when no LLM is configured (admin AiSettings still on 'env')
     * or on any error.
     *
     * @param  array<int,string>  $existingLabels
     * @param  array<int,array{title:string,snippet:string}>  $trends
     * @return array<int,array{label:string,brief:string}>
     */
    public function findGaps(string $category, array $existingLabels, array $trends, int $max = 2): array
    {
        // Ask for a few extra so dedup against existing labels still leaves
        // enough NEW candidates to reach $max authored drafts.
        $suggest = max(1, $max) + 3;
        $llm = LlmConfigResolver::resolve();
        if (! is_array($llm) || empty($llm['baseUrl']) || empty($llm['apiKey'])) {
            Log::info('SkillDiscovery: LLM not configured for backend gap analysis, skipping', [
                'category' => $category,
            ]);

            return [];
        }

        $labelList = $existingLabels === [] ? '(chưa có skill nào)' : implode(', ', $existingLabels);
        $trendText = collect($trends)
            ->take(8)
            ->map(fn ($t) => '- '.trim($t['title'].': '.$t['snippet']))
            ->implode("\n");
        $trendBlock = $trendText !== '' ? "\nXu hướng hiện hành (từ web search):\n{$trendText}\n" : '';

        $prompt = <<<PROMPT
You are a creative director curating preset "skills" (visual styles) for an AI video/image platform, category "{$category}".

Existing skill labels already available: {$labelList}
{$trendBlock}
Task: Identify up to {$suggest} TRENDING styles for this category that are NOT already covered by the existing labels and would be worth adding. Avoid near-duplicates of anything already listed.

Respond with ONLY a JSON array (no markdown, no code fences). Each item:
{"label": "short human style name", "brief": "one clear sentence describing the style so a designer could author it"}
If nothing new is worth adding, return [].
PROMPT;

        try {
            $resp = Http::withToken($llm['apiKey'])
                ->timeout(60)
                ->post(rtrim($llm['baseUrl'], '/').'/v1/chat/completions', [
                    'model' => $llm['model'],
                    'messages' => [['role' => 'user', 'content' => $prompt]],
                    'temperature' => 0.7,
                    'max_tokens' => 1200,
                ]);

            if (! $resp->successful()) {
                Log::warning('SkillDiscovery: LLM gap request failed', [
                    'category' => $category,
                    'status' => $resp->status(),
                ]);

                return [];
            }

            $text = (string) $resp->json('choices.0.message.content', '');

            // Hard upper bound so a runaway LLM response can't flood the caller;
            // the real per-run authoring cap is enforced by the command.
            return array_slice($this->parseGaps($text), 0, 12);
        } catch (\Throwable $e) {
            Log::warning('SkillDiscovery: LLM gap analysis failed', [
                'category' => $category,
                'error' => $e->getMessage(),
            ]);

            return [];
        }
    }

    /**
     * Whether $label is effectively a duplicate of one already in $existing
     * (normalized, diacritics-insensitive, substring either way).
     *
     * @param  array<int,string>  $existing
     */
    public function isDuplicateLabel(string $label, array $existing): bool
    {
        $norm = $this->normalizeLabel($label);
        if ($norm === '') {
            return true; // empty/garbage label — treat as dup so we skip it
        }

        foreach ($existing as $e) {
            $en = $this->normalizeLabel($e);
            if ($en === '') {
                continue;
            }
            if ($en === $norm || str_contains($en, $norm) || str_contains($norm, $en)) {
                return true;
            }
        }

        return false;
    }

    private function normalizeLabel(string $label): string
    {
        $ascii = Str::lower(Str::ascii($label));

        return preg_replace('/[^a-z0-9]+/', '', $ascii) ?? '';
    }

    /**
     * Parse the LLM's JSON array of gaps, tolerating code fences and alternate
     * key names (name/description). Returns normalized [{label, brief}].
     *
     * @return array<int,array{label:string,brief:string}>
     */
    private function parseGaps(string $text): array
    {
        $text = trim($text);
        // strip ```json ... ``` fences if present
        if (preg_match('/```(?:json)?\s*(.+?)```/s', $text, $m)) {
            $text = trim($m[1]);
        }
        // isolate the first [...] array
        $start = strpos($text, '[');
        $end = strrpos($text, ']');
        if ($start === false || $end === false || $end <= $start) {
            return [];
        }
        $json = substr($text, $start, $end - $start + 1);

        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        $gaps = [];
        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }
            $label = trim((string) ($item['label'] ?? $item['name'] ?? ''));
            $brief = trim((string) ($item['brief'] ?? $item['description'] ?? ''));
            if ($label === '' || mb_strlen($brief) < 5) {
                continue;
            }
            $gaps[] = ['label' => $label, 'brief' => $brief];
        }

        return $gaps;
    }
}
