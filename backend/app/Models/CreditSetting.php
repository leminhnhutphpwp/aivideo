<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class CreditSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'label',
        'unit',
        'description',
        'is_active',
        'sort_order',
    ];

    public function getRouteKeyName(): string
    {
        return 'key';
    }

    protected $casts = [
        'value' => 'decimal:6',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrderBySort(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('label');
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function set(string $key, mixed $value, string $label = '', string $unit = '', string $description = ''): void
    {
        static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'label' => $label,
                'unit' => $unit,
                'description' => $description,
            ]
        );
    }

    public static function exchangeRate(): float
    {
        return (float) static::get('exchange_rate', 0.1);
    }

    public static function vndToCredits(float $vnd): int
    {
        return (int) ($vnd * static::exchangeRate());
    }

    public static function creditsToVnd(int $credits): float
    {
        return $credits / static::exchangeRate();
    }
}
