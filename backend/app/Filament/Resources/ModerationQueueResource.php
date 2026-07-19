<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ModerationQueueResource\Pages;
use App\Models\RenderJob;
use BackedEnum;
use Filament\Actions;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * Manual-review queue for community publishes held by a degraded image-moderation verdict
 * (`RenderJob::MODERATION_PENDING`). Admins approve (release to the public feed + grant the
 * deferred creator payout) or reject (hide from the feed).
 */
class ModerationQueueResource extends Resource
{
    protected static ?string $model = RenderJob::class;

    protected static ?string $modelLabel = 'Nội dung chờ duyệt';

    protected static ?string $pluralModelLabel = 'Kiểm duyệt nội dung';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-shield-exclamation';

    protected static string|\UnitEnum|null $navigationGroup = 'An Toàn';

    protected static ?string $navigationLabel = 'Kiểm duyệt nội dung';

    protected static ?string $slug = 'moderation-queue';

    /** Assets enter the queue via the publish flow, never created in the panel. */
    public static function canCreate(): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->pendingReview();
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::query()->pendingReview()->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('published_at', 'desc')
            ->columns([
                TextColumn::make('published_at')
                    ->label('Thời gian đăng')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                TextColumn::make('user.name')
                    ->label('Người đăng')
                    ->description(fn (RenderJob $record): ?string => $record->user?->email)
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('title')
                    ->label('Nội dung')
                    ->description(fn (RenderJob $record): ?string => $record->uuid)
                    ->formatStateUsing(fn (?string $state, RenderJob $record): string => $state
                        ?: \Illuminate\Support\Str::limit((string) $record->prompt, 40, '…')
                        ?: '—')
                    ->limit(50)
                    ->searchable(),
                TextColumn::make('capability')
                    ->label('Loại')
                    ->badge()
                    ->placeholder('—'),
                TextColumn::make('visibility')
                    ->label('Hiển thị dự kiến')
                    ->badge()
                    ->color(fn (?string $state): string => $state === 'public' ? 'info' : 'gray')
                    ->formatStateUsing(fn (?string $state): string => match ($state) {
                        'public' => 'Công khai',
                        'sharing' => 'Chia sẻ',
                        default => (string) $state,
                    }),
            ])
            ->recordActions([
                Actions\Action::make('approve')
                    ->label('Duyệt')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Duyệt nội dung')
                    ->modalDescription('Nội dung sẽ hiển thị công khai trong cộng đồng. Nếu đăng ở chế độ công khai, thưởng creator sẽ được cấp.')
                    ->modalSubmitActionLabel('Duyệt')
                    ->action(function (RenderJob $record): void {
                        $record->approveModeration();
                        app(\App\Services\SkillStatsService::class)->recordPublish($record->skill_id);

                        FilamentNotification::make()
                            ->title('Đã duyệt nội dung')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('reject')
                    ->label('Từ chối')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Từ chối nội dung')
                    ->modalDescription('Nội dung sẽ bị ẩn khỏi cộng đồng và không được cấp thưởng creator.')
                    ->modalSubmitActionLabel('Từ chối')
                    ->action(function (RenderJob $record): void {
                        $record->rejectModeration();

                        FilamentNotification::make()
                            ->title('Đã từ chối nội dung')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListModerationQueue::route('/'),
        ];
    }
}
