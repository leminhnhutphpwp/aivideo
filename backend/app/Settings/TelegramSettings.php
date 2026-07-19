<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class TelegramSettings extends Settings
{
    public string $bot_token = '';

    public array $chat_ids = [];

    /**
     * Master switch — when false, no automatic event notifications are sent.
     * The "Gửi tin nhắn test" action ignores this so admins can still test config.
     */
    public bool $enabled = true;

    /** Send a Telegram notification when a user submits a credit top-up request. */
    public bool $notify_credit_purchase = true;

    /** Send a Telegram notification when a user submits a plan upgrade request. */
    public bool $notify_plan_upgrade = true;

    public static function group(): string
    {
        return 'telegram';
    }
}
