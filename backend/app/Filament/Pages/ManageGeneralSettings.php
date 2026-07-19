<?php

namespace App\Filament\Pages;

use App\Settings\GeneralSettings;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Pages\SettingsPage;
use App\Filament\Pages\SettingsTabs;

class ManageGeneralSettings extends SettingsPage
{
    protected static \BackedEnum | string | null $navigationIcon = 'heroicon-o-cog-6-tooth';

    protected static string $settings = GeneralSettings::class;

    public static function getNavigationLabel(): string
    {
        return 'Cài đặt chung';
    }

    public static function getNavigationGroup(): ?string
    {
        return 'Cấu hình hệ thống';
    }

    public function getTitle(): string|\Illuminate\Contracts\Support\Htmlable
    {
        return 'Cài đặt chung';
    }

    /**
     * The former tabs, grouped into 3 logical accordions. Each entry maps a group
     * heading → the tab classes whose inner sections belong under it. Edit this list
     * to add/reorder a settings section — no other change needed.
     */
    protected const GROUPS = [
        'Website & SEO' => [
            SettingsTabs\WebsiteTab::class,
            SettingsTabs\SeoTab::class,
            SettingsTabs\AuthBackgroundTab::class,
        ],
        'Dashboard (sau đăng nhập)' => [
            SettingsTabs\HeroTab::class,
            SettingsTabs\ShowcaseTab::class,
        ],
    ];

    public function form(Schema $schema): Schema
    {
        // Single compact page instead of 19 tabs. Each former tab's inner Section(s)
        // become collapsible accordion rows (collapsed by default), grouped under a
        // heading. Reuses the existing Tab classes verbatim — we just lift their
        // child components out of the Tab wrapper.
        $groups = [];

        foreach (static::GROUPS as $heading => $tabClasses) {
            $rows = [];

            foreach ($tabClasses as $tabClass) {
                // getDefaultChildComponents() returns the tab's inner Section(s) as a
                // plain array without needing a bound container (unlike getChildComponents()).
                foreach ((array) $tabClass::make()->getDefaultChildComponents() as $section) {
                    $rows[] = $section->collapsible()->collapsed();
                }
            }

            $groups[] = Section::make($heading)
                ->schema($rows)
                ->columnSpanFull();
        }

        return $schema->components($groups);
    }
}
