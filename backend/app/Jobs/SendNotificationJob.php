<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Notification $notification
    ) {}

    public function handle(MailService $mailService): void
    {
        if ($this->notification->isSent()) return;

        $users = match ($this->notification->audience) {
            'specific' => $this->notification->users,
            default => User::where('is_active', true)->get(),
        };

        foreach ($users as $user) {
            $this->notification->users()->syncWithoutDetaching([
                $user->id => ['read' => false],
            ]);

            if ($this->notification->send_email) {
                $templateKey = $this->notification->email_template_key ?: 'system_notification';
                $mailService->sendToUser($templateKey, $user, [
                    'title' => $this->notification->title,
                    'body' => $this->notification->body,
                ]);
            }
        }

        $this->notification->update([
            'status' => Notification::STATUS_SENT,
            'sent_at' => now(),
        ]);
    }
}
