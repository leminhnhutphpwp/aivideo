<?php

return [
    'webhook_token' => env('SEPAY_WEBHOOK_TOKEN'),
    'pattern' => env('SEPAY_MATCH_PATTERN', 'SE'),
    'bank_info' => [
        'bank' => env('SEPAY_BANK', 'MB Bank'),
        'account' => env('SEPAY_ACCOUNT', '0359123456'),
        'holder' => env('SEPAY_HOLDER'),
    ],
];
