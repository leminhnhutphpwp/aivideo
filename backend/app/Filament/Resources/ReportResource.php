<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ReportResource\Pages;
use App\Models\Report;
use BackedEnum;
use Filament\Actions;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class ReportResource extends Resource
{
    protected static ?string $model = Report::class;

    protected static ?string $modelLabel = 'Báo cáo';

    protected static ?string $pluralModelLabel = 'Báo cáo nội dung';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-flag';

    protected static string|\UnitEnum|null $navigationGroup = 'An Toàn';

    protected static ?string $navigationLabel = 'Báo cáo nội dung';

    protected static ?string $slug = 'reports';

    /** Reports are user-submitted; admins only review them. */
    public static function canCreate(): bool
    {
        return false;
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getModel()::where('status', Report::STATUS_PENDING)->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'danger';
    }

    protected static function reasonLabel(string $state): string
    {
        return match ($state) {
            'spam' => 'Spam',
            'inappropriate' => 'Không phù hợp',
            'copyright' => 'Bản quyền',
            'other' => 'Khác',
            default => $state,
        };
    }

    protected static function statusLabel(string $state): string
    {
        return match ($state) {
            Report::STATUS_PENDING => 'Chờ xử lý',
            Report::STATUS_RESOLVED => 'Đã xử lý',
            Report::STATUS_DISMISSED => 'Đã bỏ qua',
            default => $state,
        };
    }

    public static function form(Schema $schema): Schema
    {
        // Read-only resource; reports are created via the public API.
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('created_at')
                    ->label('Thời gian')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                TextColumn::make('user.name')
                    ->label('Người báo cáo')
                    ->description(fn (Report $record): ?string => $record->user?->email)
                    ->searchable()
                    ->placeholder('—'),
                TextColumn::make('renderJob.title')
                    ->label('Nội dung bị báo cáo')
                    ->description(fn (Report $record): ?string => $record->renderJob?->uuid)
                    ->formatStateUsing(fn (?string $state, Report $record): string => $state
                        ?: \Illuminate\Support\Str::limit((string) $record->renderJob?->prompt, 40, '…')
                        ?: '—')
                    ->limit(50)
                    ->searchable(),
                TextColumn::make('reason')
                    ->label('Lý do')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'spam' => 'warning',
                        'inappropriate' => 'danger',
                        'copyright' => 'info',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => static::reasonLabel($state)),
                TextColumn::make('details')
                    ->label('Chi tiết')
                    ->limit(40)
                    ->tooltip(fn (Report $record): ?string => $record->details)
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        Report::STATUS_PENDING => 'warning',
                        Report::STATUS_RESOLVED => 'success',
                        Report::STATUS_DISMISSED => 'gray',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => static::statusLabel($state)),
                TextColumn::make('renderJob.visibility')
                    ->label('Hiển thị')
                    ->badge()
                    ->color(fn (?string $state): string => in_array($state, ['sharing', 'public'], true) ? 'success' : 'gray')
                    ->formatStateUsing(fn (?string $state): string => in_array($state, ['sharing', 'public'], true)
                        ? 'Đang hiển thị'
                        : 'Đã ẩn'),
                TextColumn::make('reviewer.name')
                    ->label('Người xử lý')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Trạng thái')
                    ->options([
                        Report::STATUS_PENDING => 'Chờ xử lý',
                        Report::STATUS_RESOLVED => 'Đã xử lý',
                        Report::STATUS_DISMISSED => 'Đã bỏ qua',
                    ]),
                SelectFilter::make('reason')
                    ->label('Lý do')
                    ->options([
                        'spam' => 'Spam',
                        'inappropriate' => 'Không phù hợp',
                        'copyright' => 'Bản quyền',
                        'other' => 'Khác',
                    ]),
            ])
            ->recordActions([
                Actions\Action::make('force_unpublish')
                    ->label('Gỡ khỏi cộng đồng')
                    ->icon('heroicon-o-eye-slash')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Gỡ nội dung khỏi cộng đồng')
                    ->modalDescription('Nội dung này sẽ bị ẩn khỏi feed cộng đồng và báo cáo sẽ được đánh dấu đã xử lý. Bạn có chắc chắn?')
                    ->modalSubmitActionLabel('Gỡ nội dung')
                    ->visible(fn (Report $record): bool => (bool) $record->renderJob?->isPublished())
                    ->action(function (Report $record): void {
                        $record->renderJob?->unpublish();
                        $record->markReviewed(Report::STATUS_RESOLVED, auth()->id());

                        FilamentNotification::make()
                            ->title('Đã gỡ nội dung khỏi cộng đồng')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('resolve')
                    ->label('Đã xử lý')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Đánh dấu đã xử lý')
                    ->visible(fn (Report $record): bool => $record->isPending())
                    ->action(function (Report $record): void {
                        $record->markReviewed(Report::STATUS_RESOLVED, auth()->id());

                        FilamentNotification::make()
                            ->title('Đã đánh dấu báo cáo là đã xử lý')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('dismiss')
                    ->label('Bỏ qua')
                    ->icon('heroicon-o-x-circle')
                    ->color('gray')
                    ->requiresConfirmation()
                    ->modalHeading('Bỏ qua báo cáo')
                    ->modalDescription('Đánh dấu báo cáo này là không cần xử lý (không gỡ nội dung).')
                    ->visible(fn (Report $record): bool => $record->isPending())
                    ->action(function (Report $record): void {
                        $record->markReviewed(Report::STATUS_DISMISSED, auth()->id());

                        FilamentNotification::make()
                            ->title('Đã bỏ qua báo cáo')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReports::route('/'),
        ];
    }
}
