<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use App\Services\MailService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    // Retry transient SMTP failures. The broadcast path is retry-safe: attach
    // happens before send (syncWithoutDetaching) so already-notified users are
    // skipped on re-run — email at most once per user.
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public Notification $notification
    ) {}

    public function handle(MailService $mailService): void
    {
        if ($this->notification->isSent()) return;

        if ($this->notification->audience === 'specific') {
            // Người nhận đã được admin gán sẵn qua users()->sync — tập giới hạn.
            foreach ($this->notification->users as $user) {
                $this->sendEmailTo($mailService, $user);
            }
        } else {
            // Broadcast tới toàn bộ user active. Chunk để không nạp tất cả cùng lúc,
            // và CHỈ gửi mail cho user vừa được attach lần đầu trong lượt chạy này.
            // Attach-trước-rồi-gửi => nếu job lỗi giữa chừng + retry, user đã attach
            // sẽ bị bỏ qua (không gửi lại) — email tối đa 1 lần, tránh spam.
            User::where('is_active', true)
                ->chunkById(500, function ($users) use ($mailService) {
                    foreach ($users as $user) {
                        $result = $this->notification->users()->syncWithoutDetaching([
                            $user->id => ['read' => false],
                        ]);

                        if (in_array($user->id, $result['attached'], true)) {
                            $this->sendEmailTo($mailService, $user);
                        }
                    }
                });
        }

        $this->notification->update([
            'status' => Notification::STATUS_SENT,
            'sent_at' => now(),
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendNotificationJob failed after retries', [
            'notification_id' => $this->notification->id,
            'error' => $e->getMessage(),
        ]);
    }

    protected function sendEmailTo(MailService $mailService, User $user): void
    {
        if (!$this->notification->send_email) return;

        $templateKey = $this->notification->email_template_key ?: 'system_notification';
        $mailService->sendToUser($templateKey, $user, [
            'title' => $this->notification->title,
            'body' => $this->notification->body,
        ]);
    }
}
