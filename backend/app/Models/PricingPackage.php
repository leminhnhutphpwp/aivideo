<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingPackage extends Model
{
    protected $fillable = [
        'name',
        'description',
        'video_type_id',
        'duration_seconds',
        'resolution',
        'included_addons',
        'regular_price',
        'package_price',
        'discount_percent',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'duration_seconds' => 'integer',
        'regular_price' => 'integer',
        'package_price' => 'integer',
        'discount_percent' => 'integer',
        'included_addons' => 'array',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function videoType(): BelongsTo
    {
        return $this->belongsTo(VideoType::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function getSavingAmountAttribute(): int
    {
        return $this->regular_price - $this->package_price;
    }

    public function getSavingPercentAttribute(): float
    {
        if ($this->regular_price === 0) return 0;
        return round(($this->getSavingAmountAttribute() / $this->regular_price) * 100, 2);
    }
}
