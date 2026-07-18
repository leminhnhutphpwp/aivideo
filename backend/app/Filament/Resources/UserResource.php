<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\Plan;
use App\Models\User;
use App\Services\CreditService;
use App\Services\MailService;
use Awcodes\Curator\Components\Forms\CuratorPicker;
use Awcodes\Curator\Components\Tables\CuratorColumn;
use Filament\Actions;
use Filament\Forms;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Schemas\Components;
use Filament\Schemas\Schema;
use Filament\Tables;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $modelLabel = 'Tài khoản';

    protected static ?string $pluralModelLabel = 'Tài khoản';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-users';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

     public static function form(Schema $schema): Schema
    {
        return $schema
            ->schema([
                Components\Tabs::make('user_form')
                    ->tabs([
                        Components\Tabs\Tab::make('Thông tin tài khoản')
                            ->icon('heroicon-o-user')
                            ->schema([
                                Components\Section::make('Thông tin đăng nhập')
                                    ->schema([
                                        CuratorPicker::make('avatar_media_id')
                                            ->label('Ảnh đại diện')
                                            ->relationship('avatarMedia', 'id')
                                            ->buttonLabel('Chọn ảnh')
                                            ->size('md')
                                            ->constrained(true)
                                            ->disk('public')
                                            ->directory('uploads')
                                            ->preserveFilenames(false)
                                            ->maxSize(5120),
                                        Forms\Components\TextInput::make('name')
                                            ->label('Tên')
                                            ->required()
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('email')
                                            ->label('Email')
                                            ->email()
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->maxLength(255),
                                        Forms\Components\TextInput::make('password')
                                            ->label('Mật khẩu')
                                            ->password()
                                            ->dehydrateStateUsing(fn ($state) => Hash::make($state))
                                            ->dehydrated(fn ($state) => filled($state))
                                            ->required(fn (string $context): bool => $context === 'create')
                                            ->maxLength(255),
                                        Select::make('roles')
                                            ->label('Vai trò')
                                            ->relationship('roles', 'name')
                                            ->multiple()
                                            ->preload()
                                            ->searchable(),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Thông tin cá nhân')
                            ->icon('heroicon-o-user-group')
                            ->schema([
                                Components\Section::make('Thông tin cá nhân')
                                    ->schema([
                                        Forms\Components\TextInput::make('phone_number')
                                            ->label('Số điện thoại')
                                            ->tel()
                                            ->maxLength(20),
                                        Forms\Components\DatePicker::make('date_of_birth')
                                            ->label('Ngày sinh')
                                            ->native(false),
                                        Forms\Components\Select::make('gender')
                                            ->label('Giới tính')
                                            ->options([
                                                'male' => 'Nam',
                                                'female' => 'Nữ',
                                                'other' => 'Khác',
                                            ]),
                                        Forms\Components\Textarea::make('address')
                                            ->label('Địa chỉ')
                                            ->rows(3),
                                    ])->columns(2),
                            ]),
                        Components\Tabs\Tab::make('Gói & Credits')
                            ->icon('heroicon-o-credit-card')
                            ->schema([
                                Components\Section::make('Thông tin gói dịch vụ')
                                    ->schema([
                                Select::make('plan_id')
                                    ->label('Gói dịch vụ')
                                    ->relationship('plan', 'name')
                                    ->required(),
                                Forms\Components\DateTimePicker::make('plan_expires_at')
                                    ->label('Ngày hết hạn gói')
                                    ->native(false)
                                    ->timezone('Asia/Ho_Chi_Minh'),
                                Forms\Components\TextInput::make('credits')
                                        ->label('Credits')
                                        ->numeric()
                                        ->required(),
                                    Forms\Components\Placeholder::make('credits_total_used_display')
                                        ->label('Tổng credits đã dùng')
                                        ->content(fn (User $record) => number_format(
                                            $record->creditTransactions()
                                                ->where('type', 'usage')
                                                ->sum('amount')
                                        )),
                                    Forms\Components\Toggle::make('auto_renew')
                                        ->label('Tự động gia hạn')
                                        ->inline(false),
                                    ])->columns(3),
                            ]),
                    ])->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                CuratorColumn::make('avatarMedia')
                    ->label('Avatar')
                    ->size(40)
                    ->circular(),
                Tables\Columns\TextColumn::make('name')
                    ->label('Tên')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('plan.name')
                    ->label('Gói')
                    ->badge()
                    ->searchable(),
                Tables\Columns\TextColumn::make('credits')
                    ->label('Credits')
                    ->sortable(),
                Tables\Columns\TextColumn::make('plan_expires_at')
                    ->label('Hạn dùng gói')
                    ->dateTime('d/m/Y')
                    ->sortable()
                    ->placeholder('Vô thời hạn')
                    ->color(fn ($state) => $state && $state->isPast() ? 'danger' : 'gray'),
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Trạng thái')
                    ->boolean()
                    ->trueIcon('heroicon-o-check-circle')
                    ->falseIcon('heroicon-o-x-circle')
                    ->trueColor('success')
                    ->falseColor('danger')
                    ->sortable(),
                Tables\Columns\IconColumn::make('auto_renew')
                    ->label('Tự động GH')
                    ->boolean()
                    ->trueIcon('heroicon-o-arrow-path')
                    ->falseIcon('heroicon-o-minus')
                    ->trueColor('info')
                    ->falseColor('gray')
                    ->sortable(),
                Tables\Columns\TextColumn::make('roles.name')
                    ->badge()
                    ->label('Vai trò')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email_verified_at')
                    ->label('Xác thực email')
                    ->dateTime('d/m/Y')
                    ->sortable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y')
                    ->sortable(),
            ])
            ->filters([
                TrashedFilter::make(),
                Tables\Filters\SelectFilter::make('plan_id')
                    ->label('Gói dịch vụ')
                    ->relationship('plan', 'name'),
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Trạng thái hoạt động')
                    ->placeholder('Tất cả')
                    ->trueLabel('Đang hoạt động')
                    ->falseLabel('Đã khóa'),
                Tables\Filters\TernaryFilter::make('auto_renew')
                    ->label('Tự động gia hạn')
                    ->placeholder('Tất cả')
                    ->trueLabel('Bật')
                    ->falseLabel('Tắt'),
            ])
            ->actions([
                Actions\EditAction::make()->label('Sửa'),
                Actions\RestoreAction::make()->label('Khôi phục'),
                Actions\ForceDeleteAction::make()->label('Xoá vĩnh viễn'),
                Actions\ActionGroup::make([
                    Actions\Action::make('lock_unlock')
                        ->label(fn (User $record) => $record->is_active ? 'Khóa' : 'Mở khóa')
                        ->icon(fn (User $record) => $record->is_active ? 'heroicon-o-lock-closed' : 'heroicon-o-lock-open')
                        ->color(fn (User $record) => $record->is_active ? 'danger' : 'success')
                        ->requiresConfirmation()
                        ->modalHeading(fn (User $record) => $record->is_active ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản')
                        ->modalDescription(fn (User $record) => $record->is_active
                            ? "Bạn có chắc muốn khóa tài khoản của {$record->name}?"
                            : "Bạn có chắc muốn mở khóa tài khoản của {$record->name}?")
                        ->action(function (User $record) {
                            $wasActive = $record->is_active;
                            $record->update(['is_active' => !$wasActive]);

                            if ($wasActive) {
                                app(MailService::class)->sendToUser('account_locked', $record, [
                                    'reason' => 'Tài khoản bị khóa bởi quản trị viên',
                                ]);
                            } else {
                                app(MailService::class)->sendToUser('account_unlocked', $record, [
                                    'login_url' => url('/login'),
                                ]);
                            }
                        }),
                    Actions\Action::make('adjust_package')
                        ->label('Điều chỉnh gói')
                        ->icon('heroicon-o-credit-card')
                        ->modalWidth('sm')
                        ->form([
                            Select::make('plan_id')
                                ->label('Gói dịch vụ')
                                ->options(Plan::pluck('name', 'id'))
                                ->required(),
                            Forms\Components\TextInput::make('credits')
                                ->label('Credits')
                                ->numeric()
                                ->required(),
                        ])
                        ->action(function (array $data, User $record, CreditService $creditService) {
                            $oldPlan = $record->plan;
                            $record->update([
                                'plan_id' => $data['plan_id'],
                                'plan_expires_at' => now()->addMonth(),
                            ]);

                            $newCredits = (int) $data['credits'];
                            $diff = $newCredits - $record->credits;

                            if ($diff > 0) {
                                $creditService->addCredits($record, $diff, "Admin điều chỉnh gói: {$oldPlan->name} -> {$record->plan->name}");
                            } elseif ($diff < 0) {
                                $record->decrement('credits', abs($diff));
                            }

                            Notification::make()
                                ->title('Đã điều chỉnh gói dịch vụ thành công!')
                                ->success()
                                ->send();
                        }),
                    Actions\Action::make('renew_credits')
                        ->label('Gia hạn')
                        ->icon('heroicon-o-arrow-path')
                        ->modalWidth('sm')
                        ->form([
                            Select::make('duration_months')
                                ->label('Thời gian gia hạn')
                                ->options([
                                    1 => '1 tháng',
                                    3 => '3 tháng',
                                    6 => '6 tháng',
                                    12 => '1 năm',
                                    24 => '2 năm',
                                    36 => '3 năm',
                                    60 => '5 năm',
                                ])
                                ->default(1)
                                ->required(),
                        ])
                        ->action(function (array $data, User $record, CreditService $creditService) {
                            $plan = $record->plan;
                            if (!$plan || $plan->monthly_credits <= 0) {
                                Notification::make()
                                    ->title('Gói dịch vụ không có credits gia hạn')
                                    ->warning()
                                    ->send();
                                return;
                            }

                            $months = (int) $data['duration_months'];
                            $totalCredits = $plan->monthly_credits * $months;
                            $label = $months >= 12 ? ($months / 12) . ' năm' : $months . ' tháng';

                            $creditService->addCredits($record, $totalCredits, "Admin gia hạn {$label} ({$plan->name})");

                            $renewedAt = $record->credits_renewed_at
                                ? max($record->credits_renewed_at, now())
                                : now();
                            $record->update(['credits_renewed_at' => $renewedAt->addMonthsNoOverflow($months)]);

                            Notification::make()
                                ->title("Đã gia hạn {$totalCredits} credits ({$label}) thành công!")
                                ->success()
                                ->send();
                        }),
                ])->label('Thao tác')->icon('heroicon-o-ellipsis-vertical'),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make()->label('Xoá đã chọn'),
                    Actions\RestoreBulkAction::make()->label('Khôi phục đã chọn'),
                    Actions\ForceDeleteBulkAction::make()->label('Xoá vĩnh viễn'),
                    Actions\BulkAction::make('lock_selected')
                        ->label('Khóa đã chọn')
                        ->icon('heroicon-o-lock-closed')
                        ->color('danger')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $records->each(function (User $user) {
                                $user->update(['is_active' => false]);
                                app(MailService::class)->sendToUser('account_locked', $user, [
                                    'reason' => 'Tài khoản bị khóa bởi quản trị viên',
                                ]);
                            });
                        }),
                    Actions\BulkAction::make('unlock_selected')
                        ->label('Mở khóa đã chọn')
                        ->icon('heroicon-o-lock-open')
                        ->color('success')
                        ->requiresConfirmation()
                        ->action(function ($records) {
                            $records->each(function (User $user) {
                                $user->update(['is_active' => true]);
                                app(MailService::class)->sendToUser('account_unlocked', $user, [
                                    'login_url' => url('/login'),
                                ]);
                            });
                        }),
                    Actions\BulkAction::make('renew_selected')
                        ->label('Gia hạn đã chọn')
                        ->icon('heroicon-o-arrow-path')
                        ->color('info')
                        ->modalWidth('sm')
                        ->form([
                            Select::make('duration_months')
                                ->label('Thời gian gia hạn')
                                ->options([
                                    1 => '1 tháng',
                                    3 => '3 tháng',
                                    6 => '6 tháng',
                                    12 => '1 năm',
                                    24 => '2 năm',
                                    36 => '3 năm',
                                    60 => '5 năm',
                                ])
                                ->default(1)
                                ->required(),
                        ])
                        ->action(function (array $data, $records, CreditService $creditService) {
                            $months = (int) $data['duration_months'];
                            $label = $months >= 12 ? ($months / 12) . ' năm' : $months . ' tháng';
                            $count = 0;

                            foreach ($records as $user) {
                                $plan = $user->plan;
                                if (!$plan || $plan->monthly_credits <= 0) continue;

                                $totalCredits = $plan->monthly_credits * $months;
                                $creditService->addCredits($user, $totalCredits, "Admin gia hạn {$label} ({$plan->name}, bulk)");

                                $renewedAt = $user->credits_renewed_at
                                    ? max($user->credits_renewed_at, now())
                                    : now();
                                $user->update(['credits_renewed_at' => $renewedAt->addMonthsNoOverflow($months)]);
                                $count++;
                            }

                            Notification::make()
                                ->title("Đã gia hạn {$label} cho {$count} tài khoản!")
                                ->success()
                                ->send();
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
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
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
