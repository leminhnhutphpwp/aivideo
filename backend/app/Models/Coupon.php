<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'description', 'type', 'value', 'max_discount',
        'min_purchase_amount', 'max_uses', 'used_count', 'max_uses_per_user',
        'is_welcome', 'starts_at', 'expires_at', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'value' => 'integer',
        'max_discount' => 'integer',
        'min_purchase_amount' => 'integer',
        'max_uses' => 'integer',
        'used_count' => 'integer',
        'max_uses_per_user' => 'integer',
        'is_welcome' => 'boolean',
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    /** Codes are always stored upper-cased/trimmed so redeem (which normalizes input) matches. */
    public function setCodeAttribute($value): void
    {
        $this->attributes['code'] = strtoupper(trim((string) $value));
    }

    public function redemptions(): HasMany
    {
        return $this->hasMany(CouponRedemption::class);
    }

    /** Redemptions counting against limits (reserved holds a slot, completed keeps it). */
    public function activeRedemptions(): HasMany
    {
        return $this->redemptions()->whereIn('status', ['reserved', 'completed']);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** True if the coupon is on, within its window, and has total uses left. */
    public function isValidNow(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->expires_at && $now->gt($this->expires_at)) {
            return false;
        }
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }
        return true;
    }
}
