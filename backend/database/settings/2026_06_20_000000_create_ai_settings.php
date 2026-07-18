<?php

use Spatie\LaravelSettings\Migrations\SettingsMigration;

return new class extends SettingsMigration
{
    public function up(): void
    {
        $this->migrator->add('ai.llm_provider', 'env');
        $this->migrator->add('ai.llm_base_url', '');
        $this->migrator->add('ai.llm_api_key', '');
        $this->migrator->add('ai.llm_model', 'gpt-4o-mini');
        $this->migrator->add('ai.search_provider', 'env');
        $this->migrator->add('ai.search_api_key', '');
    }
};
