<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PlanResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'slug' => $this->slug,
            'name' => $this->name,
            'price_regular' => $this->price_regular,
            'price_sale' => $this->price_sale,
            'max_concurrent_jobs' => $this->max_concurrent_jobs,
            'monthly_credits' => $this->monthly_credits,
            'effective_credits' => $this->effective_credits,
            'audio_generation' => $this->audio_generation,
        ];
    }
}
