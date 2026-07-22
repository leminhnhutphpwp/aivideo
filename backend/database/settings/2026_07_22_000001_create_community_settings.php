<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('community.creator_payout_percent', 25);

        $this->migrator->add('community.like_weight', 2);
        $this->migrator->add('community.view_weight', 1);
        $this->migrator->add('community.trending_limit', 20);
        $this->migrator->add('community.top_creators_limit', 10);

        $this->migrator->add('community.pro_publish_limit', 5);
        $this->migrator->add('community.studio_publish_limit', 20);

        $this->migrator->add('community.rep_pub_weight', 10);
        $this->migrator->add('community.rep_like_weight', 2);
        $this->migrator->add('community.rep_usage_weight', 5);
        $this->migrator->add('community.rep_age_weight', 0.5);

        $this->migrator->add('community.rep_thresholds', [
            'newbie' => 0,
            'creator' => 100,
            'artist' => 500,
            'director' => 2000,
            'producer' => 5000,
            'legend' => 10000,
        ]);
    }
};
