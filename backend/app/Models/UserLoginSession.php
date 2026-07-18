<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserLoginSession extends Model
{
    protected $hidden = ['user_id'];

    protected $fillable = [
        'user_id',
        'device',
        'browser',
        'ip_address',
        'location',
        'login_at',
        'last_activity_at',
        'is_current',
    ];

    protected $casts = [
        'login_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'is_current' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}