<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    protected $hidden = ['id'];

    protected $fillable = [
        'slug', 'name', 'description', 'price_regular', 'price_sale',
        'max_concurrent_jobs', 'max_renders_per_day', 'api_rate_limit',
        'queue_priority', 'monthly_credits', 'bonus_credits', 'audio_generation',
        'status', 'sort_order', 'is_popular',
        'quality_multiplier', 'model_mapping', 'provider_config', 'default_provider',
    ];

    protected $casts = [
        'quality_multiplier' => 'decimal:2',
        'model_mapping' => 'array',
        'provider_config' => 'array',
        'is_popular' => 'boolean',
        'audio_generation' => 'integer',
        'max_concurrent_jobs' => 'integer',
        'max_renders_per_day' => 'integer',
        'api_rate_limit' => 'integer',
        'sort_order' => 'integer',
    ];

    // monthly_credits = base từ exchange_rate + bonus_credits (cho khuyến mãi)
    public function getEffectiveCreditsAttribute(): int
    {
        $price = $this->price_sale ?? $this->price_regular;
        $base = (int) ceil($price * CreditSetting::exchangeRate());
        return $base + ($this->bonus_credits ?? 0);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function getQualityTierCode(): string
    {
        $mult = (float) $this->quality_multiplier;
        if ($mult >= 1.8) {
            return 'ultra';
        }
        if ($mult >= 1.3) {
            return 'premium';
        }
        return 'standard';
    }

    public function resolveModelForType(string $videoTypeCode): string
    {
        $mapping = $this->model_mapping;
        if (is_string($mapping)) {
            $mapping = json_decode($mapping, true);
        }
        if ($mapping && !empty($mapping[$videoTypeCode])) {
            return $mapping[$videoTypeCode];
        }
        if ($mapping && !empty($mapping['default'])) {
            return $mapping['default'];
        }
        return \App\Services\ModelSelector::getDefaultModel($videoTypeCode);
    }

    public function getProviderApiKey(string $providerId): ?string
    {
        $config = $this->provider_config;
        if (is_string($config)) {
            $config = json_decode($config, true);
        }
        return $config[$providerId]['api_key'] ?? null;
    }

    public function getProviderBaseUrl(string $providerId): ?string
    {
        $config = $this->provider_config;
        if (is_string($config)) {
            $config = json_decode($config, true);
        }
        return $config[$providerId]['base_url'] ?? null;
    }

    public function getProviderMultiplier(string $providerId): float
    {
        $config = $this->provider_config;
        if (is_string($config)) {
            $config = json_decode($config, true);
        }
        return (float) ($config[$providerId]['multiplier'] ?? 1.0);
    }

    public function getProviderProtocol(string $providerId): string
    {
        $config = $this->provider_config;
        if (is_string($config)) {
            $config = json_decode($config, true);
        }
        $protocol = $config[$providerId]['api_protocol'] ?? 'auto';

        // Auto fallback to openai-compatible for unknown/custom providers
        if ($protocol === 'auto') {
            $knownProviders = config('media_providers.providers', []);
            if (!array_key_exists($providerId, $knownProviders)) {
                return 'openai';
            }
        }

        return $protocol;
    }

    public function getProviderForModel(string $modelId): string
    {
        // Check config first
        $providers = config('media_providers.providers', []);
        foreach ($providers as $id => $data) {
            if (isset($data['models'][$modelId])) {
                return $id;
            }
        }

        $modelIdLower = strtolower($modelId);

        // Check custom providers defined in the plan's provider_config
        $config = $this->provider_config;
        if (is_string($config)) {
            $config = json_decode($config, true);
        }
        if (is_array($config)) {
            // First check exact match in mapped_models
            foreach ($config as $customProviderId => $providerData) {
                $mappedModels = $providerData['mapped_models'] ?? [];
                if (is_array($mappedModels)) {
                    foreach ($mappedModels as $mappedModel) {
                        if (strtolower($mappedModel) === $modelIdLower) {
                            return $customProviderId;
                        }
                    }
                }
            }

            // Then check prefix matching
            $customProviderIds = array_keys($config);
            usort($customProviderIds, fn($a, $b) => strlen($b) <=> strlen($a)); // Match longest prefix first
            foreach ($customProviderIds as $customProviderId) {
                if (str_starts_with($modelIdLower, strtolower($customProviderId))) {
                    return $customProviderId;
                }
            }
        }

        // Fallback for custom or unlisted models via heuristics
        if (str_contains($modelIdLower, 'wan') || str_contains($modelIdLower, 'qwen') || str_contains($modelIdLower, 'happyhorse')) {
            return 'qwencloud';
        }
        if (str_contains($modelIdLower, 'tts-1') || str_contains($modelIdLower, 'gpt-image-2')) {
            return 'ckey';
        }
        if (str_contains($modelIdLower, 'elevenlabs')) {
            return 'elevenlabs';
        }
        if (str_contains($modelIdLower, 'cf-') || str_contains($modelIdLower, 'sdxl') || str_contains($modelIdLower, 'flux')) {
            return 'cloudflare';
        }

        return $this->default_provider ?? 'stub';
    }

    public function allowsFeature(string $feature): bool
    {
        return (bool) $this->$feature;
    }

    public function allowsResolution(string $resolution): bool
    {
        $levels = ['720p' => 1, '1080p' => 2, '4K' => 3];
        return ($levels[$resolution] ?? 0) <= ($levels[$this->max_resolution] ?? 1);
    }

    public function isFree(): bool
    {
        return $this->slug === 'free';
    }

    public function isPremium(): bool
    {
        return !$this->isFree();
    }

    public function toSnapshot(): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'description' => $this->description,
            'max_concurrent_jobs' => $this->max_concurrent_jobs,
            'queue_priority' => $this->queue_priority,
            'monthly_credits' => $this->monthly_credits,
            'effective_credits' => $this->effective_credits,
            'price_regular' => $this->price_regular,
            'price_sale' => $this->price_sale,
            'audio_generation' => $this->audio_generation,
            'status' => $this->status,
            'sort_order' => $this->sort_order,
            'is_popular' => (bool) $this->is_popular,
            'quality_tier_code' => $this->getQualityTierCode(),
            // Capability keys that have a model actually configured in model_mapping
            // (excludes 'default' and empty entries). The frontend gates any feature
            // whose capability is missing here behind a "maintenance" state.
            'capabilities' => array_values(array_filter(
                array_keys($this->model_mapping ?? []),
                fn ($key) => $key !== 'default' && !empty(($this->model_mapping ?? [])[$key] ?? null)
            )),
        ];
    }
}
