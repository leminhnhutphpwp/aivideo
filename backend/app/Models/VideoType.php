<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VideoType extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'icon',
        'base_credits',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'base_credits' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function pricingPackages(): HasMany
    {
        return $this->hasMany(PricingPackage::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function calculateBasePrice(): int
    {
        return $this->base_credits;
    }
}
