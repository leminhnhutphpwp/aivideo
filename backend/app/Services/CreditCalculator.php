<?php
namespace App\Services;

class CreditCalculator
{
    public function calculate(int $durationSeconds, string $resolution, array $extras = [], string $videoType = 'text_to_video'): int
    {
        // Map duration seconds → DurationTier code
        $durationCode = match(true) {
            $durationSeconds <= 5 => '5s',
            $durationSeconds <= 10 => '10s',
            $durationSeconds <= 15 => '15s',
            $durationSeconds <= 20 => '20s',
            default => '30s',
        };

        try {
            $result = \App\Services\Pricing\PricingCalculator::calculate([
                'video_type' => $videoType,
                'duration' => $durationCode,
                'resolution' => $resolution,
                'quality' => 'standard',
                'addons' => $extras,
                'quantity' => 1,
            ]);

            return $result['pricing']['total_credits'];
        } catch (\Exception $e) {
            // Fallback to config-based calculation if DB not seeded
            return $this->calculateFromConfig($durationSeconds, $resolution, $extras);
        }
    }

    /**
     * Fallback: config-based credit calculation (used when DB not seeded)
     */
    protected function calculateFromConfig(int $durationSeconds, string $resolution, array $extras = []): int
    {
        $matrix = config('daemon.credit_matrix.' . $resolution)
            ?? config('daemon.credit_matrix.720p');

        $cost = max($matrix['min_cost'], $durationSeconds * $matrix['per_second']);

        foreach ($extras as $extra) {
            $surcharge = config("daemon.{$extra}_surcharge");
            if ($surcharge) {
                $cost += (int) $surcharge;
            }
        }

        return $cost;
    }

    /**
     * Calculate credits for image generation (flat fee from DB VideoType, fallback to config)
     */
    public function calculateImage(bool $hasReferenceImage = false): int
    {
        $code = $hasReferenceImage ? 'image_editing' : 'image_generation';
        $videoType = \App\Models\VideoType::where('code', $code)->where('is_active', true)->first();

        if ($videoType && $videoType->base_credits > 0) {
            return $videoType->base_credits;
        }

        // Fallback to config
        return (int) config($hasReferenceImage ? 'daemon.credit_image_edit' : 'daemon.credit_image', $hasReferenceImage ? 3000 : 2000);
    }

    public function getMatrix(): array
    {
        return config('daemon.credit_matrix', []);
    }
}
