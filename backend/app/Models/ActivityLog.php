<?php

namespace App\Models;

use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity as SpatieActivity;

class ActivityLog extends SpatieActivity
{
    protected $appends = ['uuid'];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    // Get UUID attribute - generated from id for consistency
    public function getUuidAttribute(): string
    {
        if (isset($this->attributes['uuid']) && !empty($this->attributes['uuid'])) {
            return $this->attributes['uuid'];
        }
        // Generate pseudo-uuid from id for compatibility
        return sprintf(
            'log-%s-%s',
            $this->id,
            substr(md5((string) $this->id . config('app.key', 'x')), 0, 20)
        );
    }
}
