<?php

namespace App\Filament\Resources\NotificationResource\Pages;

use App\Filament\Resources\NotificationResource;
use App\Models\Notification;
use Filament\Resources\Pages\CreateRecord;

class CreateNotification extends CreateRecord
{
    protected static string $resource = NotificationResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['created_by'] = auth()->id();
        $data['status'] = Notification::STATUS_DRAFT;

        if (!empty($data['scheduled_at'])) {
            $data['status'] = Notification::STATUS_SCHEDULED;
        }

        unset($data['specific_users']);

        return $data;
    }

    protected function afterCreate(): void
    {
        $data = $this->form->getRawState();

        if (($data['audience'] ?? 'all') === 'specific' && !empty($data['specific_users'])) {
            $this->record->users()->sync($data['specific_users']);
        }

        if (empty($data['scheduled_at'])) {
            \App\Jobs\SendNotificationJob::dispatch($this->record);
        }
    }
}
