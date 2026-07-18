<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PricingAuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'event_type',
        'calculation_id',
        'request_data',
        'response_data',
        'total_credits',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'request_data' => 'array',
        'response_data' => 'array',
        'total_credits' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeCalculations($query)
    {
        return $query->where('event_type', 'calculation');
    }

    public function scopeValidations($query)
    {
        return $query->where('event_type', 'validation');
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}
