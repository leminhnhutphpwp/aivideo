<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CreditTransaction extends Model
{
    protected $hidden = ['id', 'user_id', 'render_job_id', 'storyboard_id', 'reference_code'];

    protected $fillable = [
        'uuid', 'user_id', 'render_job_id', 'storyboard_id', 'type', 'amount',
        'balance_before', 'balance_after', 'description', 'reference_code',
    ];

    protected static function booted(): void
    {
        static::creating(function ($txn) {
            $txn->uuid ??= (string) Str::uuid();
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function storyboard(): BelongsTo
    {
        return $this->belongsTo(Storyboard::class);
    }

    public function scopePurchases($query)
    {
        return $query->where('type', 'purchase');
    }

    public function scopeUsage($query)
    {
        return $query->where('type', 'usage');
    }

    public function scopeManual($query)
    {
        return $query->where('type', 'manual');
    }
}
