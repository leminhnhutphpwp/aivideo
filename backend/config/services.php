<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],
    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],
    'resend' => [
        'key' => env('RESEND_KEY'),
    ],
    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'minio' => [
        'url' => env('MINIO_CONSOLE_URL', 'http://localhost:9001'),
        'username' => env('MINIO_ROOT_USER'),
        'password' => env('MINIO_ROOT_PASSWORD'),
    ],

    'daemon' => [
        // Output-side image moderation for the public community feed. When true,
        // published image assets are checked against the daemon's vision moderator
        // (fail-open). Toggle off via DAEMON_IMAGE_MODERATION_ENABLED=false.
        'image_moderation_enabled' => env('DAEMON_IMAGE_MODERATION_ENABLED', true),
    ],

    'llm' => [
        'base_url' => env('LLM_BASE_URL', 'https://ckey.vn'),
        'api_key' => env('CKEY_API_KEY'),
        'model' => env('LLM_MODEL', 'gpt-4o-mini'),
    ],

    'phpmyadmin' => [
        'url' => env('PMA_URL', 'http://localhost:8081'),
        'username' => env('PMA_USER', 'root'),
        'password' => env('MYSQL_ROOT_PASSWORD'),
    ],

    'reverb' => [
        'url' => env('REVERB_URL', 'http://localhost:8080'),
        'username' => env('REVERB_APP_ID', '515932'),
        'password' => env('REVERB_APP_SECRET'),
    ],

    'prometheus' => [
        'url' => env('PROMETHEUS_URL', 'http://localhost:9090'),
        'username' => env('PROMETHEUS_USERNAME', 'admin'),
        'password' => env('PROMETHEUS_PASSWORD'),
    ],

    'grafana' => [
        'url' => env('GRAFANA_URL', 'http://localhost:3001'),
        'username' => env('GRAFANA_USERNAME', 'admin'),
        'password' => env('GRAFANA_PASSWORD'),
    ],

];
