<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        if (!$this->migrator->exists('general.site_description')) {
            $this->migrator->add('general.site_description', null);
        }
        if (!$this->migrator->exists('general.admin_email')) {
            $this->migrator->add('general.admin_email', null);
        }
        if (!$this->migrator->exists('general.timezone')) {
            $this->migrator->add('general.timezone', 'Asia/Ho_Chi_Minh');
        }
        if (!$this->migrator->exists('general.date_format')) {
            $this->migrator->add('general.date_format', 'd/m/Y');
        }
        if (!$this->migrator->exists('general.time_format')) {
            $this->migrator->add('general.time_format', 'H:i');
        }
        if (!$this->migrator->exists('general.showcase_items')) {
            $this->migrator->add('general.showcase_items', null);
        }
        if (!$this->migrator->exists('general.hero_video_id')) {
            $this->migrator->add('general.hero_video_id', null);
        }
        if (!$this->migrator->exists('general.site_favicon')) {
            $this->migrator->add('general.site_favicon', null);
        }
    }

    public function down(): void
    {
        $this->migrator->delete('general.showcase_items');
        $this->migrator->delete('general.hero_video_id');
        $this->migrator->delete('general.site_description');
        $this->migrator->delete('general.admin_email');
        $this->migrator->delete('general.timezone');
        $this->migrator->delete('general.date_format');
        $this->migrator->delete('general.time_format');
        $this->migrator->delete('general.site_favicon');
    }
};
