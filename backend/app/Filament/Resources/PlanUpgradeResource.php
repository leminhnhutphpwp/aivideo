<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PlanUpgradeResource\Pages;
use App\Models\PlanUpgrade;
use App\Services\CreditService;
use App\Services\MailService;
use Filament\Actions;
use Filament\Forms\Components\DatePicker;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\DB;

class PlanUpgradeResource extends Resource
{
    protected static ?string $model = PlanUpgrade::class;

    protected static ?string $modelLabel = 'Yêu cầu nâng cấp gói';

    protected static ?string $pluralModelLabel = 'Yêu cầu nâng cấp gói';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-arrow-up-circle';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::where('status', PlanUpgrade::STATUS_PENDING)->count();
    }

    protected static string | \Illuminate\Contracts\Support\Htmlable | null $navigationBadgeTooltip = 'Số yêu cầu đang chờ duyệt';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Người dùng')
                    ->searchable(),
                Tables\Columns\TextColumn::make('fromPlan.name')
                    ->label('Từ gói')
                    ->placeholder('Free')
                    ->badge()
                    ->color('gray'),
                Tables\Columns\TextColumn::make('toPlan.name')
                    ->label('Đến gói')
                    ->badge()
                    ->color('warning'),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Số tiền (VNĐ)')
                    ->formatStateUsing(fn ($state) => number_format($state) . '₫')
                    ->sortable(),
                Tables\Columns\TextColumn::make('transfer_code')
                    ->label('Mã CK')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Đã copy mã CK'),
                Tables\Columns\TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        PlanUpgrade::STATUS_PENDING => 'warning',
                        PlanUpgrade::STATUS_PAID => 'success',
                        PlanUpgrade::STATUS_CANCELLED => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        PlanUpgrade::STATUS_PENDING => 'Đang chờ',
                        PlanUpgrade::STATUS_PAID => 'Đã duyệt',
                        PlanUpgrade::STATUS_CANCELLED => 'Đã từ chối',
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
                        PlanUpgrade::STATUS_PENDING => 'Đang chờ',
                        PlanUpgrade::STATUS_PAID => 'Đã duyệt',
                        PlanUpgrade::STATUS_CANCELLED => 'Đã từ chối',
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
                    ->modalHeading('Xác nhận duyệt nâng cấp gói')
                    ->modalDescription('Bạn có chắc muốn duyệt và kích hoạt gói mới cho người dùng này?')
                    ->visible(fn (PlanUpgrade $record): bool => $record->isPending())
                    ->action(function (PlanUpgrade $record, CreditService $creditService): void {
                        DB::transaction(function () use ($record, $creditService) {
                            $record->markAsPaid();

                            $user = $record->user;
                            $now = now();
                            $expiresAt = $now->copy()->addMonth();

                            $user->update([
                                'plan_id' => $record->to_plan_id,
                                'plan_expires_at' => $expiresAt,
                            ]);

                            $user->subscriptions()->create([
                                'plan_id' => $record->to_plan_id,
                                'status' => \App\Models\Subscription::STATUS_ACTIVE,
                                'started_at' => $now,
                                'expires_at' => $expiresAt,
                            ]);

                            $toPlan = $record->toPlan;
                            if ($toPlan && $toPlan->effective_credits > 0) {
                                $creditService->addCredits(
                                    $user,
                                    $toPlan->effective_credits,
                                    "Admin duyệt đăng ký gói {$toPlan->name}"
                                );
                            }
                        });

                        // Send notification email
                        $user = $record->user;
                        $toPlan = $record->toPlan;
                        try {
                            app(MailService::class)->sendToUser('plan_upgraded', $user, [
                                'from_plan' => $record->fromPlan?->name ?? 'Free',
                                'to_plan' => $toPlan?->name ?? 'Unknown',
                                'login_url' => url('/login'),
                            ]);
                        } catch (\Throwable $e) {
                            \Log::warning('Failed to send plan upgrade notification from admin', [
                                'upgrade_id' => $record->id,
                                'error' => $e->getMessage(),
                            ]);
                        }

                        Notification::make()
                            ->title('Đã duyệt nâng cấp gói thành công')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('reject')
                    ->label('Từ chối')
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Xác nhận từ chối')
                    ->modalDescription('Bạn có chắc muốn từ chối yêu cầu nâng cấp gói này?')
                    ->visible(fn (PlanUpgrade $record): bool => $record->isPending())
                    ->action(function (PlanUpgrade $record): void {
                        $record->markAsCancelled();

                        Notification::make()
                            ->title('Đã từ chối yêu cầu nâng cấp gói')
                            ->success()
                            ->send();
                    }),
                Actions\Action::make('view')
                    ->label('Xem')
                    ->icon('heroicon-o-eye')
                    ->modalHeading('Chi tiết yêu cầu nâng cấp gói')
                    ->modalContent(function (PlanUpgrade $record) {
                        return view('filament.resources.plan-upgrade-detail', ['record' => $record]);
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
                        ->modalDescription('Bạn có chắc muốn duyệt tất cả yêu cầu nâng cấp gói đã chọn?')
                            ->action(function ($records, CreditService $creditService): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if (!$record->isPending()) continue;

                                DB::transaction(function () use ($record, $creditService) {
                                    $record->markAsPaid();

                                    $user = $record->user;
                                    $now = now();
                                    $expiresAt = $now->copy()->addMonth();

                                    $user->update([
                                        'plan_id' => $record->to_plan_id,
                                        'plan_expires_at' => $expiresAt,
                                    ]);

                                    $user->subscriptions()->create([
                                        'plan_id' => $record->to_plan_id,
                                        'status' => \App\Models\Subscription::STATUS_ACTIVE,
                                        'started_at' => $now,
                                        'expires_at' => $expiresAt,
                                    ]);

                                    $toPlan = $record->toPlan;
                                    if ($toPlan && $toPlan->effective_credits > 0) {
                                        $creditService->addCredits(
                                            $user,
                                            $toPlan->effective_credits,
                                            "Admin duyệt đăng ký gói {$toPlan->name} (bulk)"
                                        );
                                    }
                                });

                                $count++;
                            }

                            Notification::make()
                                ->title("Đã duyệt {$count} yêu cầu nâng cấp gói")
                                ->success()
                                ->send();
                        }),
                    Actions\BulkAction::make('reject_selected')
                        ->label('Từ chối đã chọn')
                        ->icon('heroicon-o-x-circle')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->modalHeading('Xác nhận từ chối hàng loạt')
                        ->modalDescription('Bạn có chắc muốn từ chối tất cả yêu cầu nâng cấp gói đã chọn?')
                        ->action(function ($records): void {
                            $count = 0;
                            foreach ($records as $record) {
                                if (!$record->isPending()) continue;
                                $record->markAsCancelled();
                                $count++;
                            }

                            Notification::make()
                                ->title("Đã từ chối {$count} yêu cầu nâng cấp gói")
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
            'index' => Pages\ListPlanUpgrades::route('/'),
        ];
    }
}
