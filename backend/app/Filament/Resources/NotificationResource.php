<?php

namespace App\Filament\Resources;

use App\Filament\Resources\NotificationResource\Pages;
use App\Models\Notification;
use App\Models\EmailTemplate;
use App\Models\User;
use BackedEnum;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\RichEditor;
use Filament\Schemas\Components\Section;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Actions;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class NotificationResource extends Resource
{
    protected static ?string $model = Notification::class;

    protected static ?string $modelLabel = 'Thông báo';

    protected static ?string $pluralModelLabel = 'Thông báo';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-megaphone';

    protected static string|\UnitEnum|null $navigationGroup = 'Hệ thống';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Nội dung thông báo')
                    ->icon('heroicon-o-megaphone')
                    ->columns(['md' => 2])
                    ->components([
                        TextInput::make('title')
                            ->label('Tiêu đề')
                            ->required()
                            ->maxLength(255),
                        Select::make('type')
                            ->label('Loại')
                            ->options([
                                Notification::TYPE_INFO => 'Thông tin',
                                Notification::TYPE_WARNING => 'Cảnh báo',
                                Notification::TYPE_SUCCESS => 'Thành công',
                                Notification::TYPE_ERROR => 'Lỗi',
                            ])
                            ->default(Notification::TYPE_INFO)
                            ->required(),
                        RichEditor::make('body')
                            ->label('Nội dung')
                            ->required()
                            ->extraInputAttributes(['style' => 'min-height: 12rem;'])
                            ->columnSpanFull(),
                    ]),
                Section::make('Đối tượng nhận')
                    ->icon('heroicon-o-users')
                    ->columns(['md' => 2])
                    ->components([
                        Select::make('audience')
                            ->label('Đối tượng')
                            ->options([
                                'all' => 'Tất cả người dùng',
                                'specific' => 'Chọn người dùng cụ thể',
                            ])
                            ->default('all')
                            ->live()
                            ->required(),
                        Select::make('specific_users')
                            ->label('Chọn người dùng')
                            ->multiple()
                            ->searchable()
                            ->options(fn () => User::where('is_active', true)->pluck('name', 'id'))
                            ->visible(fn ($get) => $get('audience') === 'specific')
                            ->columnSpanFull(),
                    ]),
                Section::make('Tuỳ chọn gửi')
                    ->icon('heroicon-o-cog')
                    ->columns(['md' => 2])
                    ->components([
                        Toggle::make('send_email')
                            ->label('Gửi thêm email đến người dùng')
                            ->default(false)
                            ->live(),
                        Select::make('email_template_key')
                            ->label('Email template')
                            ->options(EmailTemplate::where('enabled', true)->pluck('title', 'key'))
                            ->default('system_notification')
                            ->searchable()
                            ->visible(fn ($get) => $get('send_email')),
                        DateTimePicker::make('scheduled_at')
                            ->label('Lên lịch gửi sau (để trống nếu gửi ngay)')
                            ->afterOrEqual('now')
                            ->timezone('Asia/Ho_Chi_Minh'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('title')
                    ->label('Tiêu đề')
                    ->searchable()
                    ->limit(50),
                TextColumn::make('type')
                    ->label('Loại')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        Notification::TYPE_INFO => 'info',
                        Notification::TYPE_WARNING => 'warning',
                        Notification::TYPE_SUCCESS => 'success',
                        Notification::TYPE_ERROR => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        Notification::TYPE_INFO => 'Thông tin',
                        Notification::TYPE_WARNING => 'Cảnh báo',
                        Notification::TYPE_SUCCESS => 'Thành công',
                        Notification::TYPE_ERROR => 'Lỗi',
                        default => $state,
                    }),
                TextColumn::make('audience')
                    ->label('Đối tượng')
                    ->formatStateUsing(fn (string $state): string => $state === 'all' ? 'Tất cả' : 'Cụ thể'),
                IconColumn::make('send_email')
                    ->label('Email')
                    ->boolean(),
                TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        Notification::STATUS_DRAFT => 'gray',
                        Notification::STATUS_SCHEDULED => 'info',
                        Notification::STATUS_SENT => 'success',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        Notification::STATUS_DRAFT => 'Nháp',
                        Notification::STATUS_SCHEDULED => 'Đã lên lịch',
                        Notification::STATUS_SENT => 'Đã gửi',
                        default => $state,
                    }),
                TextColumn::make('scheduled_at')
                    ->label('Lịch gửi')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—'),
                TextColumn::make('sent_at')
                    ->label('Đã gửi lúc')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—'),
                TextColumn::make('creator.name')
                    ->label('Người tạo')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([])
            ->defaultSort('created_at', 'desc')
            ->recordActions([
                Actions\Action::make('send')
                    ->label('Gửi ngay')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('Xác nhận gửi thông báo')
                    ->modalDescription('Bạn có chắc muốn gửi thông báo này đến người dùng?')
                    ->visible(fn (Notification $record): bool => !$record->isSent())
                    ->action(function (Notification $record): void {
                        if ($record->isDraft()) {
                            $record->update(['status' => Notification::STATUS_SENT, 'sent_at' => now()]);
                        }

                        \App\Jobs\SendNotificationJob::dispatch($record);

                        FilamentNotification::make()
                            ->title('Đã tạo job gửi thông báo')
                            ->success()
                            ->send();
                    }),
            ])
            ->bulkActions([]);
    }

    public static function getRelations(): array
    {
        return [];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListNotifications::route('/'),
            'create' => Pages\CreateNotification::route('/create'),
            'edit' => Pages\EditNotification::route('/{record}/edit'),
        ];
    }
}
