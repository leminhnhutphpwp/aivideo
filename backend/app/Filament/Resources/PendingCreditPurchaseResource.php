<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PendingCreditPurchaseResource\Pages;
use App\Models\PendingCreditPurchase;
use App\Services\CreditService;
use Filament\Actions;
use Filament\Forms\Components\DatePicker;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\DB;

class PendingCreditPurchaseResource extends Resource
{
    protected static ?string $model = PendingCreditPurchase::class;

    protected static ?string $modelLabel = 'Yêu cầu nạp Credits';

    protected static ?string $pluralModelLabel = 'Yêu cầu nạp Credits';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::where('status', PendingCreditPurchase::STATUS_PENDING)->count();
    }

    protected static string | \Illuminate\Contracts\Support\Htmlable | null $navigationBadgeTooltip = 'Số yêu cầu đang chờ duyệt';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Người dùng')
                    ->searchable(),
                Tables\Columns\TextColumn::make('transfer_code')
                    ->label('Mã CK')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Đã copy mã CK'),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Số tiền (VNĐ)')
                    ->formatStateUsing(fn ($state) => number_format($state) . '₫')
                    ->sortable(),
                Tables\Columns\TextColumn::make('credits')
                    ->label('Credits')
                    ->sortable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        PendingCreditPurchase::STATUS_PENDING => 'warning',
                        PendingCreditPurchase::STATUS_PAID => 'success',
                        PendingCreditPurchase::STATUS_EXPIRED => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        PendingCreditPurchase::STATUS_PENDING => 'Đang chờ',
                        PendingCreditPurchase::STATUS_PAID => 'Đã duyệt',
                        PendingCreditPurchase::STATUS_EXPIRED => 'Đã từ chối',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('reference_code')
                    ->label('Mã tham chiếu')
                    ->placeholder('—')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Thời gian')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Trạng thái')
                    ->options([
                        PendingCreditPurchase::STATUS_PENDING => 'Đang chờ',
                        PendingCreditPurchase::STATUS_PAID => 'Đã duyệt',
                        PendingCreditPurchase::STATUS_EXPIRED => 'Đã từ chối',
                    ]),
                Tables\Filters\Filter::make('created_at')
                    ->label('Khoảng thời gian')
                    ->form([
                        DatePicker::make('from')->label('Từ ngày'),
                        DatePicker::make('until')->label('Đến ngày'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
                            ->when($data['until'], fn ($q, $d) => $q->whereDate('created_at', '<=', $d));
                    }),
            ])
            ->actions([
                Actions\Action::make('approve')
                    ->label('Duyệt')
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Xác nhận duyệt yêu cầu')
                    ->modalDescription('Bạn có chắc muốn duyệt và cộng credits cho yêu cầu này?')
                    ->visible(fn (PendingCreditPurchase $record): bool => $record->isPending())
                    ->action(function (PendingCreditPurchase $record, CreditService $creditService): void {
                        DB::transaction(function () use ($record, $creditService) {
                            $record->markAsPaid();
                            $creditService->addCredits(
                                $record->user,
                                $record->credits,
                                "Admin duyệt nạp credits - {$record->transfer_code}"
                            );
                        });

                        Notification::make()
                            ->title('Đã duyệt và cộng credits thành công')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('reject')
                    ->label('Từ chối')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Xác nhận từ chối')
                    ->modalDescription('Bạn có chắc muốn từ chối yêu cầu nạp credits này?')
                    ->visible(fn (PendingCreditPurchase $record): bool => $record->isPending())
                    ->action(function (PendingCreditPurchase $record): void {
                        $record->markAsExpired();

                        Notification::make()
                            ->title('Đã từ chối yêu cầu nạp credits')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('view')
                    ->label('Xem')
                    ->icon('heroicon-o-eye')
                    ->modalHeading('Chi tiết yêu cầu nạp credits')
                    ->modalContent(function (PendingCreditPurchase $record) {
                        return view('filament.resources.pending-credit-purchase-detail', ['record' => $record]);
                    }),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\BulkAction::make('approve_selected')
                        ->label('Duyệt đã chọn')
                        ->icon('heroicon-o-check-circle')
                        ->color('success')
                        ->requiresConfirmation()
                        ->modalHeading('Xác nhận duyệt hàng loạt')
                        ->modalDescription('Bạn có chắc muốn duyệt tất cả yêu cầu đã chọn?')
                        ->action(function ($records, CreditService $creditService): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if (!$record->isPending()) continue;

                                DB::transaction(function () use ($record, $creditService) {
                                    $record->markAsPaid();
                                    $creditService->addCredits(
                                        $record->user,
                                        $record->credits,
                                        "Admin duyệt nạp credits (bulk) - {$record->transfer_code}"
                                    );
                                });
                                $count++;
                            }

                            Notification::make()
                                ->title("Đã duyệt {$count} yêu cầu nạp credits")
                                ->success()
                                ->send();
                        }),
                    Actions\BulkAction::make('reject_selected')
                        ->label('Từ chối đã chọn')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalHeading('Xác nhận từ chối hàng loạt')
                        ->modalDescription('Bạn có chắc muốn từ chối tất cả yêu cầu đã chọn?')
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if (!$record->isPending()) continue;
                                $record->markAsExpired();
                                $count++;
                            }

                            Notification::make()
                                ->title("Đã từ chối {$count} yêu cầu nạp credits")
                                ->success()
                                ->send();
                        }),
                    Actions\DeleteBulkAction::make()->label('Xoá đã chọn'),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPendingCreditPurchases::route('/'),
        ];
    }
}
