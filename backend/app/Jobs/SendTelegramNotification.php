<?php

namespace App\Jobs;

use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class SendTelegramNotification implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        public string $message
    ) {}

    public function handle(TelegramService $telegram): void
    {
        $photoUrl = config('telegram.photo_url');

        if ($photoUrl) {
            $telegram->sendPhotoWithCaption($photoUrl, $this->message);
        } else {
            $telegram->sendMessage($this->message);
        }
    }
}

