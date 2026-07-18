<?php

return [
    'bot_token' => env('TELEGRAM_BOT_TOKEN', ''),
    'chat_ids' => [
        // Mặc định: có thể set trong .env nếu chỉ 1 group
        // Hoặc quản lý qua Settings page trong admin
    ],
    'api_url' => 'https://api.telegram.org/bot',
    'photo_url' => env('TELEGRAM_PHOTO_URL', ''),
];
