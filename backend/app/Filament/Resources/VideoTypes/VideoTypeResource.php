<?php

namespace App\Filament\Resources\VideoTypes;

use App\Filament\Resources\VideoTypes\Pages\CreateVideoType;
use App\Filament\Resources\VideoTypes\Pages\EditVideoType;
use App\Filament\Resources\VideoTypes\Pages\ListVideoTypes;
use App\Filament\Resources\VideoTypes\Schemas\VideoTypeForm;
use App\Filament\Resources\VideoTypes\Tables\VideoTypesTable;
use App\Models\VideoType;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class VideoTypeResource extends Resource
{
    protected static ?string $model = VideoType::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-document-text';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    protected static ?string $navigationLabel = 'Loại Video';

    protected static ?int $navigationSort = 11;

    public static function form(Schema $schema): Schema
    {
        return VideoTypeForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return VideoTypesTable::configure($table);
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
            'index' => ListVideoTypes::route('/'),
            'create' => CreateVideoType::route('/create'),
            'edit' => EditVideoType::route('/{record}/edit'),
        ];
    }
}
