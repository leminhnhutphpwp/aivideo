<?php

namespace App\Filament\Resources\CreditSettings;

use App\Filament\Resources\CreditSettings\Pages\CreateCreditSetting;
use App\Filament\Resources\CreditSettings\Pages\EditCreditSetting;
use App\Filament\Resources\CreditSettings\Pages\ListCreditSettings;
use App\Filament\Resources\CreditSettings\Schemas\CreditSettingForm;
use App\Filament\Resources\CreditSettings\Tables\CreditSettingsTable;
use App\Models\CreditSetting;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class CreditSettingResource extends Resource
{
    protected static ?string $model = CreditSetting::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    protected static ?string $navigationLabel = 'Cấu hình Credits';

    protected static ?int $navigationSort = 10;

    protected static ?string $recordTitleAttribute = 'label';

    public static function form(Schema $schema): Schema
    {
        return CreditSettingForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CreditSettingsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListCreditSettings::route('/'),
            'create' => CreateCreditSetting::route('/create'),
            'edit' => EditCreditSetting::route('/{record}/edit'),
        ];
    }
}
