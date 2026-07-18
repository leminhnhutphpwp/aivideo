<?php
namespace App\Filament\Resources\AssetResource\Pages;

use App\Filament\Resources\AssetResource;
use App\Services\AssetService;
use Filament\Actions\Action;
use Filament\Forms\Components\FileUpload;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;
use Illuminate\Http\UploadedFile;

class ListAssets extends ListRecords
{
    protected static string $resource = AssetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('upload')
                ->label('Thêm tập tin')
                ->icon('heroicon-o-arrow-up-tray')
                ->color('primary')
                ->modalHeading('Tải tập tin lên')
                ->modalDescription('Loại (ảnh / video / âm thanh) được tự nhận diện theo nội dung file. Tập tin được lưu vào MinIO và gán cho tài khoản admin của bạn.')
                ->modalSubmitActionLabel('Tải lên')
                ->schema([
                    FileUpload::make('files')
                        ->label('Tập tin')
                        ->multiple()
                        ->required()
                        // Keep the raw TemporaryUploadedFile (an UploadedFile) instead of
                        // letting Filament pre-store it — AssetService::storeUpload() owns
                        // the path convention + DB record, mirroring normal uploads.
                        ->storeFiles(false)
                        ->maxSize(512 * 1024) // KB → 512 MB per file
                        ->acceptedFileTypes(['image/*', 'video/*', 'audio/*'])
                        ->helperText('Có thể chọn nhiều tập tin. Tối đa 512MB mỗi file.')
                        ->columnSpanFull(),
                ])
                ->action(function (array $data): void {
                    $service = app(AssetService::class);
                    $admin = auth()->user();

                    $count = 0;
                    foreach ($data['files'] as $file) {
                        if ($file instanceof UploadedFile) {
                            $service->storeUpload($admin, $file);
                            $count++;
                        }
                    }

                    Notification::make()
                        ->title($count > 0 ? "Đã thêm {$count} tập tin" : 'Không có tập tin nào được thêm')
                        ->{$count > 0 ? 'success' : 'warning'}()
                        ->send();
                }),
        ];
    }
}
