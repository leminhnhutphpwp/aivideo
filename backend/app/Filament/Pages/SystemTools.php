<?php

namespace App\Filament\Pages;

use App\Filament\Widgets\ServiceCredentialsWidget;
use Filament\Pages\Page;

class SystemTools extends Page
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-squares-2x2';

    protected static ?string $navigationLabel = 'Công cụ hệ thống';

    protected static ?string $title = 'Công cụ hệ thống';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    protected static ?int $navigationSort = 0;

    public function getHeaderWidgets(): array
    {
        return [
            ServiceCredentialsWidget::class,
        ];
    }
}
