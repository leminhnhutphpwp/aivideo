<?php

namespace App\Filament\Resources\CouponEvents;

use App\Filament\Resources\CouponEvents\Pages\CreateCouponEvents;
use App\Filament\Resources\CouponEvents\Pages\EditCouponEvents;
use App\Filament\Resources\CouponEvents\Pages\ListCouponEvents;
use App\Filament\Resources\CouponEvents\Schemas\CouponEventForm;
use App\Filament\Resources\CouponEvents\Tables\CouponEventsTable;
use App\Models\CouponEvent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class CouponEventResource extends Resource
{
    protected static ?string $model = CouponEvent::class;

    protected static ?string $modelLabel = 'Sự kiện / Ưu đãi';

    protected static ?string $pluralModelLabel = 'Sự kiện / Ưu đãi';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-megaphone';

    protected static \UnitEnum|string|null $navigationGroup = 'Billing & Credits';

    public static function getSlug(?\Filament\Panel $panel = null): string
    {
        return 'coupon-events';
    }

    public static function form(Schema $schema): Schema
    {
        return CouponEventForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CouponEventsTable::configure($table);
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
            'index' => ListCouponEvents::route('/'),
            'create' => CreateCouponEvents::route('/create'),
            'edit' => EditCouponEvents::route('/{record}/edit'),
        ];
    }
}
