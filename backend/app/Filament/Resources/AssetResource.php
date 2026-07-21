<?php
namespace App\Filament\Resources;

use App\Filament\Resources\AssetResource\Pages;
use App\Models\Asset;
use Filament\Actions;
use Filament\Actions\ActionGroup;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Notifications\Notification;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class AssetResource extends Resource
{
    protected static ?string $model = Asset::class;
    protected static ?string $modelLabel = 'Tập tin';
    protected static ?string $pluralModelLabel = 'Tập tin';
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-folder';
    protected static string|\UnitEnum|null $navigationGroup = 'Video Platform';

    public static function table(Table $table): Table
    {
        $r2Ready = static::r2Ready();
        $minioReady = static::minioReady();

        return $table
            ->columns([
                TextColumn::make('type')
                    ->label('Loại')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'video' => 'success',
                        'thumbnail' => 'info',
                        'preview' => 'warning',
                        'audio' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'video' => 'Video',
                        'thumbnail' => 'Ảnh đại diện',
                        'preview' => 'Xem trước',
                        'audio' => 'Âm thanh',
                        default => $state,
                    }),
                TextColumn::make('original_name')
                    ->label('Tên file')
                    ->searchable()
                    ->limit(35),
                TextColumn::make('user.name')
                    ->label('Người dùng')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('size_bytes')
                    ->label('Kích thước')
                    ->formatStateUsing(fn ($state) => round($state / 1024 / 1024, 2) . ' MB')
                    ->sortable(),
                TextColumn::make('storage_location')
                    ->label('Lưu trữ')
                    ->badge()
                    ->color(fn (Asset $record): string => static::storageColor($record))
                    ->formatStateUsing(fn (Asset $record): string => static::storageLabel($record))
                    ->tooltip(fn (Asset $record): string => static::storageTooltip($record)),
                TextColumn::make('last_synced_at')
                    ->label('R2 lần cuối')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('Chưa đồng bộ')
                    ->sortable(),
                TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                TextColumn::make('download_count')
                    ->label('Tải')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('uuid')
                    ->label('UUID')
                    ->copyable()
                    ->copyMessage('Đã copy UUID')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->searchable(),
                TextColumn::make('path')
                    ->label('Đường dẫn')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->limit(40),
                TextColumn::make('mime_type')
                    ->label('Định dạng')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('renderJob.uuid')
                    ->label('Job UUID')
                    ->toggleable(isToggledHiddenByDefault: true)
                    ->limit(10),
            ])
            ->filters([
                TrashedFilter::make(),
                SelectFilter::make('type')
                    ->label('Loại')
                    ->options([
                        'video' => 'Video',
                        'thumbnail' => 'Ảnh đại diện',
                        'preview' => 'Xem trước',
                        'audio' => 'Âm thanh',
                    ]),
                SelectFilter::make('storage_location')
                    ->label('Nơi lưu trữ')
                    ->options(fn () => array_filter([
                        'minio' => 'MinIO (local)',
                        'both' => 'MinIO + R2',
                        'r2' => 'R2 (cloud)',
                    ]))
                    ->visible($r2Ready || $minioReady),
            ])
            ->actions([
                ActionGroup::make([
                    Actions\Action::make('push_to_r2')
                        ->label('Push lên R2')
                        ->icon('heroicon-o-cloud-arrow-up')
                        ->action(fn (Asset $record) => static::pushToR2($record))
                        ->color('info')
                        ->visible(fn () => $r2Ready)
                        ->hidden(fn (Asset $record) => $record->storage_location === 'r2' || $record->storage_location === 'both'),
                    Actions\Action::make('pull_from_r2')
                        ->label('Kéo về từ R2')
                        ->icon('heroicon-o-cloud-arrow-down')
                        ->action(fn (Asset $record) => static::pullFromR2($record))
                        ->color('warning')
                        ->visible(fn () => $r2Ready)
                        ->hidden(fn (Asset $record) => $record->storage_location !== 'r2'),
                    Actions\Action::make('delete_from_r2')
                        ->label('Xoá trên R2')
                        ->icon('heroicon-o-cloud')
                        ->action(fn (Asset $record) => static::deleteFromR2($record))
                        ->color('danger')
                        ->visible(fn () => $r2Ready)
                        ->hidden(fn (Asset $record) => $record->storage_location !== 'both' && $record->storage_location !== 'r2'),
                    Actions\Action::make('download')
                        ->label('Tải xuống')
                        ->icon('heroicon-o-arrow-down-tray')
                        ->action(function (Asset $record) {
                            $record->increment('download_count');
                            return redirect()->route('admin.assets.download', ['asset' => $record->uuid]);
                        })
                        ->color('success'),
                    DeleteAction::make()
                        ->label('Xoá mềm')
                        ->action(fn (Asset $record) => $record->delete()),
                    RestoreAction::make()->label('Khôi phục'),
                    ForceDeleteAction::make()
                        ->label('Xoá vĩnh viễn')
                        ->action(fn (Asset $record) => static::forceDeleteAssetWithFiles($record)),
                ]),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    BulkAction::make('push_r2_bulk')
                        ->label('Push lên R2')
                        ->icon('heroicon-o-cloud-arrow-up')
                        ->action(fn ($records) => $records->each(fn (Asset $r) => static::pushToR2($r)))
                        ->color('info')
                        ->visible(fn () => $r2Ready),
                    BulkAction::make('delete_bulk')
                        ->label('Xoá mềm đã chọn')
                        ->action(fn ($records) => $records->each(fn (Asset $r) => $r->delete()))
                        ->color('warning')
                        ->requiresConfirmation(),
                    Actions\RestoreBulkAction::make()->label('Khôi phục đã chọn'),
                    Actions\ForceDeleteBulkAction::make()
                        ->label('Xoá vĩnh viễn đã chọn')
                        ->action(fn ($records) => $records->each(fn (Asset $r) => static::forceDeleteAssetWithFiles($r))),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    // ──── Helpers ────

    protected static function minioReady(): bool
    {
        return !empty(config('filesystems.disks.s3.key'))
            && !empty(config('filesystems.disks.s3.secret'));
    }

    protected static function r2Ready(): bool
    {
        return !empty(config('filesystems.disks.s3-external.key'))
            && !empty(config('filesystems.disks.s3-external.secret'))
            && !empty(config('filesystems.disks.s3-external.bucket'));
    }

    protected static function storageColor(Asset $asset): string
    {
        return match ($asset->storage_location ?? 'minio') {
            'r2' => 'info',
            'both' => 'success',
            default => 'gray',
        };
    }

    protected static function storageLabel(Asset $asset): string
    {
        return match ($asset->storage_location ?? 'minio') {
            'r2' => 'R2 (cloud)',
            'both' => 'MinIO + R2',
            default => 'MinIO (local)',
        };
    }

    protected static function fileExists(string $disk, Asset $asset): bool
    {
        if (empty(config("filesystems.disks.{$disk}.key"))) return false;
        try {
            $exists = Storage::disk($disk)->exists($asset->path);
            if (!$exists && $disk === 's3-external' && in_array($asset->storage_location, ['both', 'r2'])) {
                $asset->update(['storage_location' => 'minio']);
            }
            return $exists;
        } catch (\Exception) {
            if ($disk === 's3-external' && in_array($asset->storage_location, ['both', 'r2'])) {
                $asset->update(['storage_location' => 'minio']);
            }
            return false;
        }
    }

    protected static function storageTooltip(Asset $asset): string
    {
        $minioOk = static::fileExists('s3', $asset);
        $r2Ok = static::fileExists('s3-external', $asset);

        return match (true) {
            $asset->storage_location === 'r2' && $r2Ok => 'File trên Cloudflare R2',
            $asset->storage_location === 'r2' && !$r2Ok => 'File không tồn tại (đã xoá khỏi R2)',
            $minioOk && $r2Ok => 'File trên MinIO + R2',
            $minioOk => 'File trên MinIO',
            $r2Ok => 'File trên R2 (cờ chưa cập nhật)',
            !$minioOk && !$r2Ok => 'File không tồn tại (orphaned)',
            default => 'Chưa rõ',
        };
    }

    // ──── Actions ────

    protected static function pushToR2(Asset $asset): void
    {
        if (!static::r2Ready()) {
            Notification::make()->title('Chưa cấu hình R2')->warning()->send();
            return;
        }

        if ($asset->storage_location === 'r2' || $asset->storage_location === 'both') {
            Notification::make()->title('File đã có trên R2')->success()->send();
            return;
        }

        $source = Storage::disk('s3');
        $target = Storage::disk('s3-external');

        if (!$source->exists($asset->path)) {
            Notification::make()->title('File không tồn tại trên MinIO')->danger()->send();
            return;
        }

        try {
            $stream = $source->readStream($asset->path);
            $target->writeStream($asset->path, $stream);
            if (is_resource($stream)) fclose($stream);

            $asset->update([
                'storage_location' => 'both',
                'last_synced_at' => now(),
            ]);

            Notification::make()->title('Đã push lên R2 thành công')->success()->send();
        } catch (\Exception $e) {
            Notification::make()->title('Lỗi: ' . $e->getMessage())->danger()->send();
        }
    }

    protected static function pullFromR2(Asset $asset): void
    {
        if (!static::r2Ready()) {
            Notification::make()->title('Chưa cấu hình R2')->warning()->send();
            return;
        }

        if ($asset->storage_location !== 'r2') {
            Notification::make()->title('File đã có trên MinIO, không cần kéo về')->warning()->send();
            return;
        }

        $source = Storage::disk('s3-external');
        $target = Storage::disk('s3');

        if (!$source->exists($asset->path)) {
            Notification::make()->title('File không tồn tại trên R2')->danger()->send();
            return;
        }

        try {
            $stream = $source->readStream($asset->path);
            $target->writeStream($asset->path, $stream);
            if (is_resource($stream)) fclose($stream);

            $asset->update(['storage_location' => 'both']);

            Notification::make()->title('Đã kéo file từ R2 về MinIO')->success()->send();
        } catch (\Exception $e) {
            Notification::make()->title('Lỗi: ' . $e->getMessage())->danger()->send();
        }
    }

    protected static function deleteFromR2(Asset $asset): void
    {
        if (!static::r2Ready()) return;

        $r2 = Storage::disk('s3-external');

        if (!$r2->exists($asset->path)) {
            Notification::make()->title('File không tồn tại trên R2')->warning()->send();
            return;
        }

        // Nếu file chỉ có trên R2, kéo về MinIO trước khi xoá
        if ($asset->storage_location === 'r2') {
            try {
                $stream = $r2->readStream($asset->path);
                Storage::disk('s3')->writeStream($asset->path, $stream);
                if (is_resource($stream)) fclose($stream);
            } catch (\Exception $e) {
                Notification::make()->title('Kéo file về MinIO thất bại: ' . $e->getMessage())->danger()->send();
                return;
            }
        }

        try {
            $previousLocation = $asset->storage_location;
            $r2->delete($asset->path);
            $asset->update(['storage_location' => 'minio']);
            Notification::make()->title('Đã xoá khỏi R2' . ($previousLocation === 'r2' ? ', file đã kéo về MinIO' : ''))->success()->send();
        } catch (\Exception $e) {
            Notification::make()->title('Lỗi: ' . $e->getMessage())->danger()->send();
        }
    }

    protected static function forceDeleteAssetWithFiles(Asset $asset): void
    {
        foreach (['s3', 's3-external'] as $disk) {
            if (!empty(config("filesystems.disks.{$disk}.key"))) {
                try { Storage::disk($disk)->delete($asset->path); } catch (\Exception) {}
            }
        }

        $localPath = storage_path("app/{$asset->path}");
        if (file_exists($localPath)) {
            unlink($localPath);
        }

        $asset->forceDelete();
    }

    protected static function deleteAssetWithFiles(Asset $asset): void
    {
        static::forceDeleteAssetWithFiles($asset);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAssets::route('/'),
        ];
    }
}
