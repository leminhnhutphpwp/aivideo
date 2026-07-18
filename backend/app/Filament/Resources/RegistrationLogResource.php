<?php

namespace App\Filament\Resources;

use App\Filament\Resources\RegistrationLogResource\Pages;
use App\Models\RegistrationLog;
use Filament\Actions;
use Filament\Schemas\Schema;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class RegistrationLogResource extends Resource
{
    protected static ?string $model = RegistrationLog::class;
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-shield-check';
    protected static string|\UnitEnum|null $navigationGroup = 'An Toàn';
    protected static ?string $navigationLabel = 'Đăng ký';
    protected static ?string $label = 'Log Đăng ký';
    protected static ?string $pluralLabel = 'Logs Đăng ký';
    protected static ?string $slug = 'registration-logs';

    public static function canCreate(): bool
    {
        return false;
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->schema([
            Tables\Columns\TextColumn::make('email')->disabled(),
            Tables\Columns\TextColumn::make('ip_address')->disabled(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Thời gian')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('ip_address')
                    ->label('IP')
                    ->searchable(),
                Tables\Columns\IconColumn::make('success')
                    ->label('Thành công')
                    ->boolean(),
                Tables\Columns\TextColumn::make('user_agent')
                    ->label('User Agent')
                    ->limit(50)
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\Filter::make('today')
                    ->label('Hôm nay')
                    ->query(fn (Builder $query) => $query->whereDate('created_at', today())),
                Tables\Filters\Filter::make('failed_only')
                    ->label('Chỉ thất bại')
                    ->query(fn (Builder $query) => $query->where('success', false)),
            ])
            ->actions([
                Actions\Action::make('block_ip')
                    ->label('Chặn IP')
                    ->icon('heroicon-o-no-symbol')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->action(fn (RegistrationLog $record) => 
                        app(\App\Services\AntiAbuse\AntiAbuseService::class)->blockIp($record->ip_address)
                    ),
                Actions\Action::make('unblock_ip')
                    ->label('Bỏ chặn')
                    ->icon('heroicon-o-lock-open')
                    ->color('success')
                    ->requiresConfirmation()
                    ->action(function (RegistrationLog $record) {
                        \Illuminate\Support\Facades\Cache::forget(
                            'anti_abuse:blocked:' . $record->ip_address
                        );
                    })
                    ->visible(fn (RegistrationLog $record) => 
                        \Illuminate\Support\Facades\Cache::has(
                            'anti_abuse:blocked:' . $record->ip_address
                        )
                    ),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\Action::make('block_selected_ips')
                        ->label('Chặn IP đã chọn')
                        ->icon('heroicon-o-no-symbol')
                        ->color('danger')
                        ->action(fn (array $records) => 
                            collect($records)->pluck('ip_address')->unique()->each(fn ($ip) =>
                                app(\App\Services\AntiAbuse\AntiAbuseService::class)->blockIp($ip)
                            )
                        ),
                ]),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRegistrationLogs::route('/'),
        ];
    }
}
