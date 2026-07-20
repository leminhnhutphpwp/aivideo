<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
            'anti.abuse' => \App\Http\Middleware\AntiAbuseMiddleware::class,
            'bff.verify' => \App\Http\Middleware\VerifyBffSignature::class,
            'turnstile' => \App\Http\Middleware\VerifyTurnstile::class,
            'coupon.guard' => \App\Http\Middleware\CouponAbuseGuard::class,
        ]);
        
        $middleware->appendToGroup('web', \App\Http\Middleware\SecurityHeaders::class);
        $middleware->appendToGroup('api', \App\Http\Middleware\TraceIdMiddleware::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        if (config('app.env') === 'production') {
            $exceptions->dontReport([
                \Illuminate\Auth\AuthenticationException::class,
                \Illuminate\Validation\ValidationException::class,
            ]);
        }
    })->create();
