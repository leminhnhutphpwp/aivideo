<?php

namespace App\Filament\Resources\DurationTiers;

use App\Filament\Resources\DurationTiers\Pages\CreateDurationTier;
use App\Filament\Resources\DurationTiers\Pages\EditDurationTier;
use App\Filament\Resources\DurationTiers\Pages\ListDurationTiers;
use App\Filament\Resources\DurationTiers\Schemas\DurationTierForm;
use App\Filament\Resources\DurationTiers\Tables\DurationTiersTable;
use App\Models\DurationTier;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class DurationTierResource extends Resource
{
    protected static ?string $model = DurationTier::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-clock';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    protected static ?string $navigationLabel = 'Thời Lượng';

    protected static ?int $navigationSort = 12;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return DurationTierForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return DurationTiersTable::configure($table);
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
            'index' => ListDurationTiers::route('/'),
            'create' => CreateDurationTier::route('/create'),
            'edit' => EditDurationTier::route('/{record}/edit'),
        ];
    }
}
