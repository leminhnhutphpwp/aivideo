<?php

namespace App\Jobs;

use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class SendTelegramNotification implements ShouldQueue
{
    use Dispatchable, Queueable;

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
}
