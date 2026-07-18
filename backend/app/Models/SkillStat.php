<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Aggregate community signal counters for a single skill (keyed by its SkillService
 * id, e.g. "image-direction/natural-photo"). Written only via SkillStatsService so
 * increments stay atomic; read by the studio ranking endpoint and the
 * skills:refresh-examples learning command.
 */
class SkillStat extends Model
{
    protected $fillable = [
        'skill_id', 'category', 'usage_count', 'published_count', 'likes_count', 'last_used_at',
    ];

    protected $casts = [
        'usage_count' => 'integer',
        'published_count' => 'integer',
        'likes_count' => 'integer',
        'last_used_at' => 'datetime',
    ];
}
