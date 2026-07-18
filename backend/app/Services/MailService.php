<?php
namespace App\Services;

use App\Jobs\SendMailJob;
use App\Models\EmailTemplate;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class MailService
{
    /**
     * Queue an email for delivery.
     * Returns true if queued successfully, false if template missing.
     */
    public function send(string $templateKey, string $to, array $data = [], ?User $user = null): bool
    {
        $template = EmailTemplate::where('key', $templateKey)->where('enabled', true)->first();
        if (!$template) {
            Log::warning("MailService: Template '{$templateKey}' not found or disabled");
            return false;
        }

        SendMailJob::dispatch($templateKey, $to, $data, $user?->id);
        return true;
    }

    /**
     * Queue an email to a user.
     */
    public function sendToUser(string $templateKey, User $user, array $extraData = []): bool
    {
        $data = array_merge([
            'name' => $user->name,
            'email' => $user->email,
        ], $extraData);

        return $this->send($templateKey, $user->email, $data, $user);
    }
}
