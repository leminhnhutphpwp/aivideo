<?php

use Illuminate\Support\Facades\URL;

return [
    'paths' => ['api/*', 'broadcasting/auth'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => [
        // Development
        'http://localhost:3000',
        'http://localhost:8000',
        // Production - thêm domain thực tế ở đây
        env('FRONTEND_URL', 'http://localhost:3000'),
    ],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-TOKEN'],
    'exposed_headers' => ['X-Total-Count', 'X-Page-Count', 'Content-Disposition'],
    'max_age' => 86400, // 24 hours
    'supports_credentials' => true,
    'write_credentials' => true,
];
