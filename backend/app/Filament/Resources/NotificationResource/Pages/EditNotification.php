<?php

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use App\Models\Notification;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification as FilamentNotification;
use Filament\Resources\Pages\EditRecord;

class EditNotification extends EditRecord
{
    protected static string $resource = NotificationResource::class;

    protected function mutateFormDataBeforeFill(array $data): array
    {
        if ($data['audience'] === 'specific') {
            $data['specific_users'] = $this->record->users->pluck('id')->toArray();
        }

        return $data;
    }

    protected function mutateFormDataBeforeSave(array $data): array
    {
        unset($data['specific_users']);
        return $data;
    }

    protected function afterSave(): void
    {
        $data = $this->form->getRawState();

        if (($data['audience'] ?? 'all') === 'specific' && !empty($data['specific_users'])) {
            $this->record->users()->sync($data['specific_users']);
        }
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('send')
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
            DeleteAction::make(),
        ];
    }
}
