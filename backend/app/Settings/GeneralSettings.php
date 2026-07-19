<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class GeneralSettings extends Settings
{
    public string $site_name;
    public ?int $site_favicon;
    public ?array $showcase_items;
    public ?string $hero_video_id;
    public ?string $auth_bg_media_id;
    public ?string $seo_title;
    public ?string $seo_description;
    public ?string $seo_keywords;
    public ?int $seo_og_image;

    public static function group(): string
    {
        return 'general';
    }
}
