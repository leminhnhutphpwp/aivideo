<?php

namespace App\Jobs;

use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class SendTelegramNotification implements ShouldQueue
{
    use Dispatchable, Queueable;

    // Retry transient Telegram API/network failures instead of dropping silently.
    public int $tries = 3;
    public int $backoff = 30;

    /**
     * @param  string  $message  HTML message body to deliver.
     * @param  string|null  $event  Event key used to honour per-event toggles
     *                              (credit_purchase, plan_upgrade). Null = generic.
     */
    public function __construct(
        public string $message,
        public ?string $event = null,
    ) {}

    public function handle(TelegramService $telegram): void
    {
        // Respect the master switch and per-event toggles configured in admin.
        if (! $telegram->shouldNotify($this->event)) {
            return;
        }

        $photoUrl = config('telegram.photo_url');

        if ($photoUrl) {
            $telegram->sendPhotoWithCaption($photoUrl, $this->message);
        } else {
            $telegram->sendMessage($this->message);
        }
    }

    public function failed(\Throwable $e): void
    {
        Log::error('SendTelegramNotification failed after retries', [
            'event' => $this->event,
            'error' => $e->getMessage(),
        ]);
    }
}
