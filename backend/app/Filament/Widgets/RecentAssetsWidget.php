<?php

namespace App\Filament\Widgets;

use App\Models\Asset;
use Filament\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Widgets\TableWidget as BaseWidget;

class RecentAssetsWidget extends BaseWidget
{
    protected static ?int $sort = 4;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = '15s';

    protected function getTableQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return Asset::query()
            ->with(['user', 'renderJob'])
            ->latest()
            ->limit(20);
    }

    protected function getTableColumns(): array
    {
        return [
            TextColumn::make('id')
                ->label('ID')
                ->width(40)
                ->sortable(),

            TextColumn::make('uuid')
                ->label('UUID')
                ->limit(12)
                ->copyable()
                ->toggleable(isToggledHiddenByDefault: true),

            TextColumn::make('type')
                ->label('Loại')
                ->badge()
                ->color(fn (string $state): string => match ($state) {
                    'video' => 'success',
                    'thumbnail' => 'info',
                    'preview' => 'warning',
                    'audio' => 'gray',
                    default => 'gray',
                })
                ->formatStateUsing(fn (string $state): string => match ($state) {
                    'video' => '🎬 Video',
                    'thumbnail' => '🖼 Ảnh nhỏ',
                    'preview' => '👁 Xem trước',
                    'audio' => '🎵 Âm thanh',
                    default => $state,
                }),

            TextColumn::make('user.name')
                ->label('Người dùng')
                ->searchable()
                ->limit(18),

            TextColumn::make('renderJob.uuid')
                ->label('Job UUID')
                ->limit(10)
                ->toggleable(),

            TextColumn::make('original_name')
                ->label('Tên file')
                ->limit(25)
                ->searchable(),

            TextColumn::make('mime_type')
                ->label('MIME')
                ->limit(15)
                ->toggleable(isToggledHiddenByDefault: true),

            TextColumn::make('size_bytes')
                ->label('Kích thước')
                ->formatStateUsing(function ($state): string {
                    $bytes = (int) $state;
                    if ($bytes >= 1073741824) return round($bytes / 1073741824, 2) . ' GB';
                    if ($bytes >= 1048576) return round($bytes / 1048576, 1) . ' MB';
                    if ($bytes >= 1024) return round($bytes / 1024, 1) . ' KB';
                    return "{$bytes} B";
                })
                ->color(function ($state): string {
                    $bytes = (int) $state;
                    if ($bytes >= 104857600) return 'danger';
                    if ($bytes >= 10485760) return 'warning';
                    return 'gray';
                })
                ->alignRight(),

            TextColumn::make('path')
                ->label('Đường dẫn')
                ->limit(30)
                ->toggleable(isToggledHiddenByDefault: true),

            TextColumn::make('is_public')
                ->label('Công khai')
                ->formatStateUsing(fn ($state) => $state ? '✅' : '🔒')
                ->toggleable(),

            TextColumn::make('created_at')
                ->label('Tạo lúc')
                ->dateTime('H:i d/m')
                ->since()
                ->sortable(),
        ];
    }

    protected function getTableActions(): array
    {
        return [
            Action::make('view')
                ->label('Chi tiết')
                ->icon('heroicon-m-eye')
                ->modalHeading(fn (Asset $record): string => "Tập tin #{$record->id}")
                ->modalContent(function (Asset $record) {
                    $size = $record->size_bytes;
                    if ($size >= 1073741824) $sizeStr = round($size / 1073741824, 2) . ' GB';
                    elseif ($size >= 1048576) $sizeStr = round($size / 1048576, 1) . ' MB';
                    elseif ($size >= 1024) $sizeStr = round($size / 1024, 1) . ' KB';
                    else $sizeStr = "{$size} B";

                    $typeLabels = ['video' => 'Video', 'thumbnail' => 'Ảnh nhỏ', 'preview' => 'Xem trước', 'audio' => 'Âm thanh'];

                    return view('filament.resources.asset-detail', [
                        'asset' => $record,
                        'sizeStr' => $sizeStr,
                        'typeLabel' => $typeLabels[$record->type] ?? $record->type,
                    ]);
                }),
        ];
    }

    protected function getTableRecordUrlUsing(): ?\Closure
    {
        return null;
    }
}
