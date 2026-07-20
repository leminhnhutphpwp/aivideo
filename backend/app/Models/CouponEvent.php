<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * Sự kiện / chiến dịch ưu đãi: mỗi user nhận 1 mã coupon RIÊNG (unique) được đúc từ event.
 * `auto_grant` = tự cấp khi đăng ký/xác thực; ngược lại user tự "nhận mã" qua API.
 */
class CouponEvent extends Model
{
    public const TRIGGER_MANUAL = 'manual';

    public const TRIGGER_SIGNUP = 'signup';

    public const TRIGGER_BIRTHDAY = 'birthday';

    protected $fillable = [
        'name', 'slug', 'description', 'reward_type', 'reward_value',
        'max_discount', 'min_purchase_amount', 'code_prefix', 'max_claims',
        'claims_count', 'per_user_uses', 'code_valid_days', 'starts_at', 'ends_at',
        'trigger', 'require_verified', 'is_active', 'is_public', 'sort_order',
    ];

    protected $casts = [
        'reward_value' => 'integer',
        'max_discount' => 'integer',
        'min_purchase_amount' => 'integer',
        'max_claims' => 'integer',
        'claims_count' => 'integer',
        'per_user_uses' => 'integer',
        'code_valid_days' => 'integer',
        'sort_order' => 'integer',
        'require_verified' => 'boolean',
        'is_active' => 'boolean',
        'is_public' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
    ];

    public function setSlugAttribute($value): void
    {
        $this->attributes['slug'] = Str::slug((string) $value);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** True nếu event đang trong cửa sổ nhận và còn lượt tổng. */
    public function isClaimableNow(): bool
    {
        if (! $this->is_active) {
            return false;
        }
        $now = now();
        if ($this->starts_at && $now->lt($this->starts_at)) {
            return false;
        }
        if ($this->ends_at && $now->gt($this->ends_at)) {
            return false;
        }
        if ($this->max_claims !== null && $this->claims_count >= $this->max_claims) {
            return false;
        }
        return true;
    }

    public function coupons(): HasMany
    {
        return $this->hasMany(Coupon::class);
    }
}
