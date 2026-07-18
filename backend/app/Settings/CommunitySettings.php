<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class CommunitySettings extends Settings
{
    public int $creator_payout_percent = 25;

    public int $like_weight = 2;
    public int $view_weight = 1;
    public int $trending_limit = 20;
    public int $top_creators_limit = 10;

    public int $pro_publish_limit = 5;
    public int $studio_publish_limit = 20;

    public int $rep_pub_weight = 10;
    public int $rep_like_weight = 2;
    public int $rep_usage_weight = 5;
    public float $rep_age_weight = 0.5;

    public array $rep_thresholds = [
        'newbie' => 0,
        'creator' => 100,
        'artist' => 500,
        'director' => 2000,
        'producer' => 5000,
        'legend' => 10000,
    ];

    public static function group(): string
    {
        return 'community';
    }
}
