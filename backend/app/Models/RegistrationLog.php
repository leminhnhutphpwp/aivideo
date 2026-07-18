<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationLog extends Model
{
    public $timestamps = false;
    
    protected $fillable = [
        'email',
        'ip_address',
        'user_agent',
        'device_hash',
        'success',
        'created_at',
    ];

    protected $casts = [
        'success' => 'boolean',
        'created_at' => 'datetime',
    ];
}
