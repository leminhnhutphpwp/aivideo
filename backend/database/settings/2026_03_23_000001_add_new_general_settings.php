<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('general.site_description', null);
        $this->migrator->add('general.site_favicon', null);
        $this->migrator->add('general.admin_email', null);
        $this->migrator->add('general.timezone', 'Asia/Ho_Chi_Minh');
        $this->migrator->add('general.date_format', 'd/m/Y');
        $this->migrator->add('general.time_format', 'H:i');
    }
};
