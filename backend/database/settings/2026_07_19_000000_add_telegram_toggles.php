<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        // Master on/off switch. Default true so existing (already-working)
        // installs keep their current sending behaviour after migrating.
        if (! $this->migrator->exists('telegram.enabled')) {
            $this->migrator->add('telegram.enabled', true);
        }

        // Per-event toggles — default true to preserve current behaviour.
        if (! $this->migrator->exists('telegram.notify_credit_purchase')) {
            $this->migrator->add('telegram.notify_credit_purchase', true);
        }

        if (! $this->migrator->exists('telegram.notify_plan_upgrade')) {
            $this->migrator->add('telegram.notify_plan_upgrade', true);
        }
    }

    public function down(): void
    {
        $this->migrator->delete('telegram.enabled');
        $this->migrator->delete('telegram.notify_credit_purchase');
        $this->migrator->delete('telegram.notify_plan_upgrade');
    }
};
