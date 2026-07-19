<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CouponRedemption extends Model
{
    protected $fillable = [
        'coupon_id', 'user_id', 'status', 'credits_granted', 'amount_discounted',
        'pending_credit_purchase_id', 'credit_transaction_id', 'redeemed_at',
    ];

    protected $casts = [
        'credits_granted' => 'integer',
        'amount_discounted' => 'integer',
        'redeemed_at' => 'datetime',
    ];

    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
