<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ApiKey extends Model
{
    protected $fillable = ['user_id', 'name', 'key', 'prefix', 'last_used_at', 'expires_at', 'revoked'];

    protected $hidden = ['id', 'user_id', 'key'];

    protected $casts = [
        'revoked' => 'boolean',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isValid(): bool
    {
        return !$this->revoked && (!$this->expires_at || $this->expires_at->isFuture());
    }

    public function touchLastUsed(): void
    {
        $this->update(['last_used_at' => now()]);
    }

    public static function generateKey(): string
    {
        return 'pv_' . Str::random(32);
    }
}
