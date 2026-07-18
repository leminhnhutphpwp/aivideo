<?php

namespace App\Filament\Resources\ResolutionPricings;

use App\Filament\Resources\ResolutionPricings\Pages\CreateResolutionPricing;
use App\Filament\Resources\ResolutionPricings\Pages\EditResolutionPricing;
use App\Filament\Resources\ResolutionPricings\Pages\ListResolutionPricings;
use App\Filament\Resources\ResolutionPricings\Schemas\ResolutionPricingForm;
use App\Filament\Resources\ResolutionPricings\Tables\ResolutionPricingsTable;
use App\Models\ResolutionPricing;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class ResolutionPricingResource extends Resource
{
    protected static ?string $model = ResolutionPricing::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-device-phone-mobile';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    protected static ?string $navigationLabel = 'Độ Phân Giải';

    protected static ?int $navigationSort = 13;

    protected static ?string $recordTitleAttribute = 'name';

    public static function form(Schema $schema): Schema
    {
        return ResolutionPricingForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return ResolutionPricingsTable::configure($table);
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
            'index' => ListResolutionPricings::route('/'),
            'create' => CreateResolutionPricing::route('/create'),
            'edit' => EditResolutionPricing::route('/{record}/edit'),
        ];
    }
}
