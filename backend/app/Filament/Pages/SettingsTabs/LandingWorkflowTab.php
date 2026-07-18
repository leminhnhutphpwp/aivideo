<?php

namespace App\Filament\Pages\SettingsTabs;

use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\TextInput;

class LandingWorkflowTab
{
    public static function make(): Tab
    {
        return Tab::make('landing_workflow')
            ->label('Workflow')
            ->icon('heroicon-o-arrow-path')
            ->schema([
                Section::make('Workflow (Quy Trình)')
                    ->description('Section thứ 6 — các bước hoạt động')
                    ->columns(2)
                    ->schema([
                        TextInput::make('workflow_label')->label('Label')->maxLength(50),
                    ]),
            ]);
    }
}
