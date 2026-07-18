<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StoryboardReference extends Model
{
    use SoftDeletes;
    protected $hidden = ['storyboard_id', 'asset_id'];

    protected $fillable = [
        'storyboard_id', 'type', 'asset_id', 'media_path',
        'description', 'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function storyboard(): BelongsTo
    {
        return $this->belongsTo(Storyboard::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeCharacters($query)
    {
        return $query->where('type', 'character');
    }

    public function scopeProducts($query)
    {
        return $query->where('type', 'product');
    }

    public function scopeBackgrounds($query)
    {
        return $query->where('type', 'background');
    }
}
