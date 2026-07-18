<?php

namespace App\Services;

use App\Models\QualityTier;
use App\Models\VideoType;
use Illuminate\Support\Facades\Log;

class ModelSelector
{
    /**
     * Resolve model for a given Plan and video type
     *
     * @param \App\Models\Plan|string $plan Plan instance or Plan slug (backwards compatibility)
     * @param string $videoTypeCode Video type code (text_to_video, image_to_video, etc.)
     * @return string Resolved model ID
     */
    public function resolve($plan, string $videoTypeCode): string
    {
        if (is_string($plan)) {
            $plan = \App\Models\Plan::where('slug', $plan)->first() 
                ?? \App\Models\Plan::where('quality_multiplier', '>=', match($plan) {
                    'ultra' => 1.8,
                    'premium' => 1.3,
                    default => 1.0,
                })->first()
                ?? \App\Models\Plan::first();
        }

        if ($plan instanceof \App\Models\Plan) {
            $model = $plan->resolveModelForType($videoTypeCode);

            Log::info('Model resolved from plan config', [
                'plan' => $plan->slug,
                'video_type' => $videoTypeCode,
                'model' => $model,
            ]);

            return $model;
        }

        // Fallback to system default
        $defaultModel = self::getDefaultModel($videoTypeCode);

        Log::info('Model resolved from system default', [
            'plan' => 'unknown',
            'video_type' => $videoTypeCode,
            'model' => $defaultModel,
        ]);

        return $defaultModel;
    }

    /**
     * Get all available models grouped by provider
     * For use in admin select options
     */
    public function getAvailableModels(): array
    {
        $providers = config('media_providers.providers', []);
        $available = [];

        foreach ($providers as $id => $data) {
            $label = $data['label'] ?? $id;
            $models = [];
            foreach (($data['models'] ?? []) as $modelId => $modelData) {
                $costHint = $modelData['cost_hint'] ?? '';
                $models[$modelId] = $modelId . ($costHint ? " ($costHint)" : '');
            }
            if (!empty($models)) {
                $available[$label] = $models;
            }
        }

        return $available;
    }

    /**
     * Get default model for a video type
     */
    public static function getDefaultModel(string $videoTypeCode): string
    {
        $defaults = config('media_providers.default_models', []);
        return $defaults[$videoTypeCode] ?? ($defaults['text_to_video'] ?? 'wan2.6-t2v');
    }
}
