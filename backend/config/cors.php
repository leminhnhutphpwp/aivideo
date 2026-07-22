<?php

use Illuminate\Support\Facades\URL;

return [
    'paths' => ['api/*', 'broadcasting/auth'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_values(array_filter([
        // Production / real frontend origin.
        env('FRONTEND_URL'),
        // Development-only origins — never emitted in non-local envs, since
        // supports_credentials=true + a localhost origin is unsafe in production.
        // NB: use env('APP_ENV'), NOT app()->environment() — this file is evaluated
        // during config bootstrap before the container binds 'env', and app()->environment()
        // there fatals with "Class env does not exist".
        ...(env('APP_ENV', 'production') === 'local' ? [
            'http://localhost:3000',
            'http://localhost:8000',
        ] : []),
    ])),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-CSRF-TOKEN'],
    'exposed_headers' => ['X-Total-Count', 'X-Page-Count', 'Content-Disposition'],
    'max_age' => 86400, // 24 hours
    'supports_credentials' => true,
    'write_credentials' => true,
];
