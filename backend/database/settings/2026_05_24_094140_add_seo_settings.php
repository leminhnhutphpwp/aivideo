<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        if (!$this->migrator->exists('general.seo_title')) {
            $this->migrator->add('general.seo_title', null);
        }
        if (!$this->migrator->exists('general.seo_description')) {
            $this->migrator->add('general.seo_description', null);
        }
        if (!$this->migrator->exists('general.seo_keywords')) {
            $this->migrator->add('general.seo_keywords', null);
        }
        if (!$this->migrator->exists('general.seo_og_image')) {
            $this->migrator->add('general.seo_og_image', null);
        }
    }

    public function down(): void
    {
        $this->migrator->delete('general.seo_title');
        $this->migrator->delete('general.seo_description');
        $this->migrator->delete('general.seo_keywords');
        $this->migrator->delete('general.seo_og_image');
    }
};
