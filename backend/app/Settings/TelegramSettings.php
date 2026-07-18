<?php

namespace App\Settings;

use Spatie\LaravelSettings\Settings;

class TelegramSettings extends Settings
{
    public string $bot_token = '';
    public array $chat_ids = [];

    public static function group(): string
    {
        return 'telegram';
    }
}
