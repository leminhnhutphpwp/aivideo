<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fail-closed on default/placeholder secrets — production only, so tests/local are
        // never affected.
        if ($this->app->environment('production')) {
            \App\Support\SecretGuard::assert([
                'JWT_SECRET' => config('jwt.secret'),
                'DAEMON_WEBHOOK_SECRET' => config('daemon.webhook_secret'),
            ]);
        }

        // Fix Filament "Route [login] not defined" for unauthenticated access
        \Illuminate\Support\Facades\URL::forceRootUrl(config('app.url'));
        
        // Add trace_id to all log contexts
        $this->addTraceIdToLogContext();

        // Email log
        \Illuminate\Support\Facades\Event::listen(
            \Illuminate\Mail\Events\MessageSent::class,
            function ($event) {
                $message = $event->message;
                $toAddresses = [];
                if ($message->getTo()) {
                    foreach ($message->getTo() as $address) {
                        $toAddresses[] = $address->getAddress();
                    }
                }
                \App\Models\EmailLog::create([
                    'to' => implode(', ', $toAddresses),
                    'subject' => $message->getSubject() ?? '(No Subject)',
                    'body' => $message->getHtmlBody() ?? $message->getTextBody() ?? '',
                    'status' => 'sent',
                ]);
            }
        );

        // SEPay webhook listener
        \Illuminate\Support\Facades\Event::listen(
            \SePay\SePay\Events\SePayWebhookEvent::class,
            \App\Listeners\SePayWebhookListener::class,
        );
    }

    protected function addTraceIdToLogContext(): void
    {
        \Illuminate\Support\Facades\Log::pushProcessor(function ($record) {
            $request = request();
            if ($request && $request->attributes->has('trace_id')) {
                $record['extra']['trace_id'] = $request->attributes->get('trace_id');
            }
            return $record;
        });
    }
}
