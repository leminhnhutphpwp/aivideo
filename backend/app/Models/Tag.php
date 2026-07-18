<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tag extends Model
{
    public $timestamps = false;

    protected $fillable = ['slug', 'label_vi', 'usage_count'];

    public static function upsertFromArray(array $tags): void
    {
        foreach ($tags as $label) {
            $slug = self::slugify($label);
            $existing = self::where('slug', $slug)->first();
            if ($existing) {
                $existing->increment('usage_count');
            } else {
                self::create([
                    'slug' => $slug,
                    'label_vi' => $label,
                    'usage_count' => 1,
                ]);
            }
        }
    }

    public static function slugify(string $label): string
    {
        $slug = mb_strtolower(trim($label));
        $slug = preg_replace('/[^a-z0-9\x{0080}-\x{FFFF}\s\-]/u', '', $slug);
        $slug = preg_replace('/[\s\-]+/', '-', $slug);
        $slug = trim($slug, '-');
        return mb_substr($slug ?: 'tag', 0, 50);
    }
}
