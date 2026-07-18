<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Report extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_RESOLVED = 'resolved';
    public const STATUS_DISMISSED = 'dismissed';

    protected $fillable = [
        'user_id', 'render_job_id', 'reason', 'details',
        'status', 'reviewed_at', 'reviewed_by',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function isPending(): bool
    {
        return ($this->status ?? self::STATUS_PENDING) === self::STATUS_PENDING;
    }

    /**
     * Mark the report as handled by an admin.
     *
     * @param  self::STATUS_RESOLVED|self::STATUS_DISMISSED  $status
     */
    public function markReviewed(string $status, ?int $reviewerId = null): void
    {
        $this->update([
            'status' => $status,
            'reviewed_at' => now(),
            'reviewed_by' => $reviewerId,
        ]);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function renderJob(): BelongsTo
    {
        return $this->belongsTo(RenderJob::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
