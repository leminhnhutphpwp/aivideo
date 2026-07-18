<?php

namespace App\Filament\Resources\WhitelistIps;

use App\Filament\Resources\WhitelistIps\Pages\CreateWhitelistIp;
use App\Filament\Resources\WhitelistIps\Pages\EditWhitelistIp;
use App\Filament\Resources\WhitelistIps\Pages\ListWhitelistIps;
use App\Filament\Resources\WhitelistIps\Schemas\WhitelistIpForm;
use App\Filament\Resources\WhitelistIps\Tables\WhitelistIpsTable;
use App\Models\WhitelistIp;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class WhitelistIpResource extends Resource
{
    protected static ?string $model = WhitelistIp::class;
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCheckBadge;
    protected static string|\UnitEnum|null $navigationGroup = 'An Toàn';
    protected static ?string $navigationLabel = 'IP Cho phép';
    protected static ?string $label = 'IP';
    protected static ?string $pluralLabel = 'IP Cho phép';
    protected static ?string $slug = 'ip-whitelist';

    public static function form(Schema $schema): Schema
    {
        return WhitelistIpForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return WhitelistIpsTable::configure($table);
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
            'index' => ListWhitelistIps::route('/'),
            'create' => CreateWhitelistIp::route('/create'),
            'edit' => EditWhitelistIp::route('/{record}/edit'),
        ];
    }
}
