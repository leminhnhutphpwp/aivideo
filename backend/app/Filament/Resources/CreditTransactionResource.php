<?php
namespace App\Filament\Resources;

use App\Filament\Resources\CreditTransactionResource\Pages;
use App\Models\CreditTransaction;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class CreditTransactionResource extends Resource
{
    protected static ?string $model = CreditTransaction::class;

    protected static ?string $modelLabel = 'Giao dịch';

    protected static ?string $pluralModelLabel = 'Giao dịch';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-banknotes';

    protected static string|\UnitEnum|null $navigationGroup = 'Billing & Credits';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('type')
                    ->label('Loại')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'purchase' => 'success',
                        'usage', 'reserved' => 'warning',
                        'refund' => 'info',
                        'manual' => 'primary',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'purchase' => 'Mua',
                        'usage' => 'Sử dụng',
                        'reserved' => 'Đã giữ',
                        'refund' => 'Hoàn tiền',
                        'manual' => 'Thủ công',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('amount')
                    ->label('Số lượng')
                    ->formatStateUsing(fn ($state) => $state >= 0 ? "+{$state}" : $state)
                    ->color(fn ($state) => $state >= 0 ? 'success' : 'danger'),
                Tables\Columns\TextColumn::make('balance_after')
                    ->label('Số dư sau')
                    ->sortable(),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Người dùng')
                    ->searchable(),
                Tables\Columns\TextColumn::make('renderJob.uuid')
                    ->label('Job UUID')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->copyable(),
                Tables\Columns\TextColumn::make('description')
                    ->label('Mô tả')
                    ->limit(50)
                    ->searchable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Thời gian')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('type')
                    ->label('Loại giao dịch')
                    ->options([
                        'purchase' => 'Mua',
                        'usage' => 'Sử dụng',
                        'reserved' => 'Đã giữ',
                        'refund' => 'Hoàn tiền',
                        'manual' => 'Thủ công',
                    ]),
                Tables\Filters\Filter::make('created_at')
                    ->label('Khoảng thời gian')
                    ->form([
                        \Filament\Forms\Components\DatePicker::make('from')
                            ->label('Từ ngày'),
                        \Filament\Forms\Components\DatePicker::make('until')
                            ->label('Đến ngày'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['from'], fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
                            ->when($data['until'], fn ($q, $d) => $q->whereDate('created_at', '<=', $d));
                    }),
            ])
            ->actions([
                \Filament\Actions\ViewAction::make()
                    ->label('Xem')
                    ->modalHeading('Chi tiết giao dịch')
                    ->modalContent(function (CreditTransaction $record) {
                        return view('filament.resources.credit-transaction-detail', ['txn' => $record]);
                    }),
            ])
            ->defaultSort('created_at', 'desc')
            ->headerActions([
                \Filament\Actions\CreateAction::make()
                    ->label('Tặng credits')
                    ->icon('heroicon-o-gift')
                    ->color('success')
                    ->modalHeading('Tặng credits thủ công cho người dùng')
                    ->modalWidth('md')
                    ->form([
                        \Filament\Forms\Components\Select::make('user_id')
                            ->label('Người dùng')
                            ->required()
                            ->searchable()
                            ->preload()
                            ->getSearchResultsUsing(fn (string $search) => 
                                \App\Models\User::where('name', 'like', "%{$search}%")
                                    ->orWhere('email', 'like', "%{$search}%")
                                    ->limit(50)
                                    ->get()
                                    ->mapWithKeys(fn ($user) => [$user->id => "{$user->name} - {$user->email}"])
                                    ->toArray()
                            )
                            ->getOptionLabelUsing(fn ($value): string => 
                                ($user = \App\Models\User::find($value)) ? "{$user->name} - {$user->email}" : ''
                            ),
                        \Filament\Forms\Components\TextInput::make('amount')
                            ->label('Số credits')
                            ->required()
                            ->numeric()
                            ->minValue(1)
                            ->maxValue(100000)
                            ->helperText('Nhập số dương để tặng, số âm để trừ credits'),
                        \Filament\Forms\Components\Textarea::make('description')
                            ->label('Mô tả')
                            ->required()
                            ->rows(3)
                            ->placeholder('Lý do tặng credits, ví dụ: "Thưởng cho user xuất sắc tháng 5"'),
                    ])
                    ->action(function (array $data): void {
                        $user = \App\Models\User::findOrFail($data['user_id']);
                        $amount = (int) $data['amount'];
                        $description = $data['description'];
                        
                        // Calculate new balance
                        $balanceBefore = $user->credits;
                        $newBalance = $balanceBefore + $amount;
                        
                        // Create transaction
                        \App\Models\CreditTransaction::create([
                            'user_id' => $user->id,
                            'type' => 'manual',
                            'amount' => $amount,
                            'balance_before' => $balanceBefore,
                            'balance_after' => $newBalance,
                            'description' => $description,
                            'render_job_id' => null,
                        ]);
                        
                        // Update user balance
                        $user->update(['credits' => $newBalance]);
                        
                        // Log action
                        activity()
                            ->causedBy(auth()->user())
                            ->performedOn($user)
                            ->withProperties([
                                'amount' => $amount,
                                'balance_before' => $balanceBefore,
                                'balance_after' => $newBalance,
                                'description' => $description,
                            ])
                            ->log('manual_credit_transaction');
                        
                        // Send notification
                        try {
                            $user->notify(new \App\Notifications\ManualCreditNotification($amount, $description, $newBalance));
                        } catch (\Throwable $e) {
                            // Ignore notification errors
                            \Log::warning('Failed to send manual credit notification', [
                                'user_id' => $user->id,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    })
                    ->successNotificationTitle('Đã tặng credits thành công')
                    ->failureNotificationTitle('Không thể tặng credits')
                    ->modalSubmitActionLabel('Xác nhận')
                    ->modalCancelActionLabel('Huỷ'),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCreditTransactions::route('/'),
        ];
    }
}
