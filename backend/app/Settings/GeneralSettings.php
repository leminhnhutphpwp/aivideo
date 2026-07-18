<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class GeneralSettings extends Settings
{
    public string $site_name;
    public bool $site_active;
    public ?string $site_description;
    public ?int $site_favicon;
    public ?string $admin_email;
    public string $timezone;
    public string $date_format;
    public string $time_format;
    public ?array $showcase_items;
    public ?string $hero_video_id;
    public ?string $auth_bg_media_id;
    public ?string $seo_title;
    public ?string $seo_description;
    public ?string $seo_keywords;
    public ?int $seo_og_image;

    public ?string $hero_label = null;
    public ?string $hero_title_line1 = null;
    public ?string $hero_title_line2 = null;
    public ?string $hero_subtitle = null;
    public ?string $hero_cta_text = null;
    public ?string $hero_cta_url = null;
    public ?string $hero_typewriter_words = null;
    public ?string $portal_label_texts = null;
    public ?string $portal_title_line1 = null;
    public ?string $portal_title_line2 = null;
    public ?string $portal_subtitle = null;
    public ?string $portal_cta_text = null;
    public ?string $portal_login_text = null;
    public ?string $portal_login_label = null;
    public ?string $reel_label = null;
    public ?string $reel_title_line1 = null;
    public ?string $reel_title_line2 = null;

    public ?string $intro_label = null;
    public ?string $intro_title_line1 = null;
    public ?string $intro_title_line2 = null;
    public ?string $intro_subtitle = null;
    public ?string $intro_features = null;

    public ?string $genesis_label = null;
    public ?string $genesis_title_line1 = null;
    public ?string $genesis_title_line2 = null;

    public ?string $forge_label = null;
    public ?string $forge_cta_text = null;

    public ?string $workflow_label = null;

    public ?string $director_label = null;
    public ?string $director_title_line1 = null;
    public ?string $director_title_line2 = null;
    public ?string $director_subtitle = null;

    public ?string $gallery_label = null;
    public ?string $gallery_title_line1 = null;
    public ?string $gallery_title_line2 = null;

    public ?string $sound_label = null;
    public ?string $sound_title_line1 = null;
    public ?string $sound_title_line2 = null;

    public ?string $ecosystem_label = null;
    public ?string $ecosystem_title_line1 = null;
    public ?string $ecosystem_title_line2 = null;
    public ?string $ecosystem_subtitle = null;

    public ?string $stats_label = null;
    public ?string $stats_title_line1 = null;
    public ?string $stats_title_line2 = null;

    public ?string $vision_label = null;
    public ?string $vision_title_line1 = null;
    public ?string $vision_title_line2 = null;
    public ?string $vision_description_p1 = null;
    public ?string $vision_description_p2 = null;

    public ?string $footer_copyright = null;
    public ?string $footer_privacy_url = null;
    public ?string $footer_terms_url = null;
    public ?string $footer_contact_url = null;

    public static function group(): string
    {
        return 'general';
    }
}
