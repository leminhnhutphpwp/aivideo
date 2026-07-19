<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    /**
     * Landing content is now hardcoded in the Next.js app, and a few general
     * settings were never read at runtime. Delete their rows so the settings
     * table stays lean. Guarded by exists() — landing keys were never migrated
     * in, so those rows may not be present; unused-config rows were.
     */
    public function up(): void
    {
        $keys = [
            // General configs that had no runtime reader.
            'site_active', 'site_description', 'admin_email',
            'timezone', 'date_format', 'time_format',
            // Landing CMS props (hero/portal/reel/intro/genesis/forge/workflow/
            // director/gallery/sound/ecosystem/stats/vision/footer).
            'hero_label', 'hero_title_line1', 'hero_title_line2', 'hero_subtitle',
            'hero_cta_text', 'hero_cta_url', 'hero_typewriter_words',
            'portal_label_texts', 'portal_title_line1', 'portal_title_line2', 'portal_subtitle',
            'portal_cta_text', 'portal_login_text', 'portal_login_label',
            'reel_label', 'reel_title_line1', 'reel_title_line2',
            'intro_label', 'intro_title_line1', 'intro_title_line2', 'intro_subtitle', 'intro_features',
            'genesis_label', 'genesis_title_line1', 'genesis_title_line2',
            'forge_label', 'forge_cta_text',
            'workflow_label',
            'director_label', 'director_title_line1', 'director_title_line2', 'director_subtitle',
            'gallery_label', 'gallery_title_line1', 'gallery_title_line2',
            'sound_label', 'sound_title_line1', 'sound_title_line2',
            'ecosystem_label', 'ecosystem_title_line1', 'ecosystem_title_line2', 'ecosystem_subtitle',
            'stats_label', 'stats_title_line1', 'stats_title_line2',
            'vision_label', 'vision_title_line1', 'vision_title_line2',
            'vision_description_p1', 'vision_description_p2',
            'footer_copyright', 'footer_privacy_url', 'footer_terms_url', 'footer_contact_url',
        ];

        foreach ($keys as $key) {
            if ($this->migrator->exists("general.{$key}")) {
                $this->migrator->delete("general.{$key}");
            }
        }
    }
};
