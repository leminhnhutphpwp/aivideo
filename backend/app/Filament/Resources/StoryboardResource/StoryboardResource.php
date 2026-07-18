<?php

namespace App\Filament\Resources\StoryboardResource;

use App\Filament\Resources\StoryboardResource\Pages;
use App\Filament\Resources\StoryboardResource\Schemas\StoryboardForm;
use App\Filament\Resources\StoryboardResource\Tables\StoryboardsTable;
use App\Models\Storyboard;
use Filament\Panel;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;

class StoryboardResource extends Resource
{
    protected static ?string $model = Storyboard::class;

    protected static \BackedEnum|string|null $navigationIcon = 'heroicon-o-film';

    protected static string|\UnitEnum|null $navigationGroup = 'Video Platform';

    protected static ?string $navigationLabel = 'Storyboard';

    protected static ?int $navigationSort = 6;

    public static function getSlug(?Panel $panel = null): string
    {
        return 'storyboards';
    }

    public static function form(Schema $schema): Schema
    {
        return StoryboardForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return StoryboardsTable::configure($table);
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
            'index' => Pages\ListStoryboards::route('/'),
            'create' => Pages\CreateStoryboard::route('/create'),
            'edit' => Pages\EditStoryboard::route('/{record}/edit'),
            'view' => Pages\ViewStoryboard::route('/{record}'),
        ];
    }
}
