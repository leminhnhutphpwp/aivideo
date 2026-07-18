<?php

namespace App\Support;

use App\Settings\AiSettings;

/**
 * Resolves the admin-managed AI config (App\Settings\AiSettings) into the
 * override payload passed to the daemon, so every AI feature (skill authoring,
 * prompt enhancement, …) shares one config source. `provider = 'env'` ⇒ null,
 * letting the daemon fall back to its own .env. `'custom'` ⇒ any
 * OpenAI-compatible endpoint via base_url.
 */
class LlmConfigResolver
{
    /** LLM override, or null to let the daemon use its .env. */
    public static function resolve(): ?array
    {
        $s = app(AiSettings::class);
        if ($s->llm_provider === 'env' || $s->llm_api_key === '') {
            return null;
        }

        $known = ['ckey' => 'https://ckey.vn', 'openai' => 'https://api.openai.com'];
        $baseUrl = $s->llm_provider === 'custom'
            ? $s->llm_base_url
            : ($known[$s->llm_provider] ?? '');

        return [
            'providerId' => $s->llm_provider === 'custom' ? 'custom' : $s->llm_provider,
            'baseUrl' => $baseUrl,
            'apiKey' => $s->llm_api_key,
            'model' => $s->llm_model ?: 'gpt-4o-mini',
        ];
    }

    /** Search override: null ('env' → daemon .env), 'none' (off), or Tavily key. */
    public static function resolveSearch(): ?array
    {
        $s = app(AiSettings::class);

        return match ($s->search_provider) {
            'tavily' => $s->search_api_key !== '' ? ['provider' => 'tavily', 'apiKey' => $s->search_api_key] : null,
            'none' => ['provider' => 'none', 'apiKey' => ''],
            default => null,
        };
    }
}
