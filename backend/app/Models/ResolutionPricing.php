<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResolutionPricing extends Model
{
    protected $fillable = [
        'code',
        'name',
        'width',
        'height',
        'multiplier',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'width' => 'integer',
        'height' => 'integer',
        'multiplier' => 'decimal:2',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function applyMultiplier(int $baseCredits): int
    {
        return (int) ($baseCredits * $this->multiplier);
    }
}
