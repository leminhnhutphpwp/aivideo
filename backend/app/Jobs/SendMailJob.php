<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendMailJob implements ShouldQueue
{
    use Queueable;

    /** Số lần thử tối đa trước khi coi là thất bại vĩnh viễn. */
    public int $tries = 3;

    public function __construct(
        public string $templateKey,
        public string $to,
        public array $data,
        public ?int $userId = null,
    ) {}

    /**
     * Exponential backoff giữa các lần retry (giây).
     *
     * @return array<int, int>
     */
    public function backoff(): array
    {
        return [30, 120, 300];
    }

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

    /**
     * Dead-letter: log lần thất bại cuối cùng sau khi hết retry.
     */
    public function failed(Throwable $exception): void
    {
        Log::error('SendMailJob: gửi mail thất bại vĩnh viễn', [
            'template_key' => $this->templateKey,
            'to' => $this->to,
            'user_id' => $this->userId,
            'error' => $exception->getMessage(),
        ]);
    }
}
