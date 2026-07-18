<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        if (!$this->migrator->exists('general.auth_bg_media_id')) {
            $this->migrator->add('general.auth_bg_media_id', null);
        }
    }

    public function down(): void
    {
        $this->migrator->delete('general.auth_bg_media_id');
    }
};
