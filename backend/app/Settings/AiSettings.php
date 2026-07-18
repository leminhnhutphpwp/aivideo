<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

/**
 * Admin-managed AI provider config (like plan provider_config). Resolved by
 * SkillAuthoringService and passed to the daemon per-request, so changing it
 * needs no .env edit / rebuild. `provider = 'env'` ⇒ fall back to the daemon's
 * own .env. `provider = 'custom'` ⇒ any OpenAI-compatible endpoint via base_url.
 */
class AiSettings extends Settings
{
    /** env | ckey | openai | gemini | custom */
    public string $llm_provider = 'env';

    public string $llm_base_url = '';

    public string $llm_api_key = '';

    public string $llm_model = 'gpt-4o-mini';

    /** env | none | tavily */
    public string $search_provider = 'env';

    public string $search_api_key = '';

    public static function group(): string
    {
        return 'ai';
    }
}
