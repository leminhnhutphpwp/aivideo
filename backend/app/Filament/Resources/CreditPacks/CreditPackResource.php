<?php

namespace App\Filament\Resources\CreditPacks;

use App\Filament\Resources\CreditPacks\Pages\CreateCreditPack;
use App\Filament\Resources\CreditPacks\Pages\EditCreditPack;
use App\Filament\Resources\CreditPacks\Pages\ListCreditPacks;
use App\Filament\Resources\CreditPacks\Schemas\CreditPackForm;
use App\Filament\Resources\CreditPacks\Tables\CreditPacksTable;
use App\Models\CreditPack;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class CreditPackResource extends Resource
{
    protected static ?string $model = CreditPack::class;

    protected static ?string $modelLabel = 'Gói nạp Credits';

    protected static ?string $pluralModelLabel = 'Gói nạp Credits';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static \UnitEnum|string|null $navigationGroup = 'Billing & Credits';

    public static function form(Schema $schema): Schema
    {
        return CreditPackForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CreditPacksTable::configure($table);
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
            'index' => ListCreditPacks::route('/'),
            'create' => CreateCreditPack::route('/create'),
            'edit' => EditCreditPack::route('/{record}/edit'),
        ];
    }
}
