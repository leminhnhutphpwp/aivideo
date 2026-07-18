<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendMailJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $templateKey,
        public string $to,
        public array $data,
        public ?int $userId = null,
    ) {}

    public function handle(): void
    {
        $template = \App\Models\EmailTemplate::where('key', $this->templateKey)
            ->where('enabled', true)
            ->first();

        if (!$template) {
            Log::warning("SendMailJob: Template '{$this->templateKey}' not found or disabled");
            return;
        }

        $rendered = $template->render($this->data);

        Mail::html($rendered['body'], function ($message) use ($rendered) {
            $message->to($this->to)->subject($rendered['subject']);
        });
    }
}
