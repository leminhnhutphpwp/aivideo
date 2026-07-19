<?php

namespace App\Services;

use App\Settings\TelegramSettings;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected ?string $botToken = null;

    protected array $chatIds = [];

    protected bool $enabled = false;

    protected bool $notifyCreditPurchase = true;

    protected bool $notifyPlanUpgrade = true;

    public function __construct()
    {
        try {
            $settings = app(TelegramSettings::class);
            $this->botToken = $settings->bot_token ?: config('telegram.bot_token');
            $this->chatIds = $settings->chat_ids ?: [];
            $this->enabled = $settings->enabled;
            $this->notifyCreditPurchase = $settings->notify_credit_purchase;
            $this->notifyPlanUpgrade = $settings->notify_plan_upgrade;
        } catch (\Throwable $e) {
            // Settings row missing (e.g. migration not run yet) — fall back to env config.
            $this->botToken = config('telegram.bot_token') ?: null;
            Log::warning('TelegramService: Failed to load settings: ' . $this->redact($e->getMessage()));
        }
    }

    /**
     * The bot has the minimum config required to actually send a message.
     * Used as a precondition for the "test message" action too.
     */
    public function isConfigured(): bool
    {
        return ! empty($this->botToken) && ! empty($this->chatIds);
    }

    /** Master switch — automatic event notifications are turned on. */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }

    /**
     * Should we send an automatic notification for the given event?
     *
     * @param  string|null  $event  One of: credit_purchase, plan_upgrade, or null (generic).
     */
    public function shouldNotify(?string $event = null): bool
    {
        if (! $this->enabled || ! $this->isConfigured()) {
            return false;
        }

        return match ($event) {
            'credit_purchase' => $this->notifyCreditPurchase,
            'plan_upgrade' => $this->notifyPlanUpgrade,
            default => true,
        };
    }

    public function sendMessage(string $message): bool
    {
        if (! $this->isConfigured()) {
            Log::warning('TelegramService: Bot not configured, skipping message');

            return false;
        }

        $success = true;
        foreach ($this->chatIds as $chatId) {
            try {
                $response = Http::timeout(10)
                    ->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                        'chat_id' => trim((string) $chatId),
                        'text' => $message,
                        'parse_mode' => 'HTML',
                        'disable_web_page_preview' => true,
                    ]);

                if (! $response->successful()) {
                    Log::error("TelegramService: Failed to send to {$chatId}: " . $this->redact($response->body()));
                    $success = false;
                }
            } catch (\Throwable $e) {
                Log::error("TelegramService: Exception sending to {$chatId}: " . $this->redact($e->getMessage()));
                $success = false;
            }
        }

        return $success;
    }

    public function sendPhotoWithCaption(string $photoUrl, string $caption): bool
    {
        if (! $this->isConfigured()) {
            Log::warning('TelegramService: Bot not configured, skipping photo message');

            return false;
        }

        $success = true;
        foreach ($this->chatIds as $chatId) {
            try {
                $response = Http::timeout(15)
                    ->post("https://api.telegram.org/bot{$this->botToken}/sendPhoto", [
                        'chat_id' => trim((string) $chatId),
                        'photo' => $photoUrl,
                        'caption' => $caption,
                        'parse_mode' => 'HTML',
                    ]);

                if (! $response->successful()) {
                    Log::error("TelegramService: Failed to send photo to {$chatId}: " . $this->redact($response->body()));
                    $success = false;
                }
            } catch (\Throwable $e) {
                Log::error("TelegramService: Exception sending photo to {$chatId}: " . $this->redact($e->getMessage()));
                $success = false;
            }
        }

        return $success;
    }

    public function sendTestMessage(): bool
    {
        $photoUrl = config('telegram.photo_url');
        if ($photoUrl) {
            return $this->sendPhotoWithCaption($photoUrl, '✅ <b>Telegram Bot hoạt động tốt!</b>');
        }

        return $this->sendMessage('✅ Telegram Bot hoạt động tốt!');
    }

    /**
     * Fetch bot metadata (getMe). Cached briefly to avoid an HTTP round-trip
     * on every admin page load.
     */
    public function getBotInfo(): ?array
    {
        if (empty($this->botToken)) {
            return null;
        }

        $cacheKey = 'telegram:bot_info:' . md5($this->botToken);

        return Cache::remember($cacheKey, now()->addSeconds(60), function () {
            try {
                $response = Http::timeout(5)
                    ->get("https://api.telegram.org/bot{$this->botToken}/getMe");

                if ($response->successful()) {
                    return $response->json('result');
                }
            } catch (\Throwable $e) {
                Log::error('TelegramService: getMe failed: ' . $this->redact($e->getMessage()));
            }

            return null;
        });
    }

    public function getUpdates(): array
    {
        if (empty($this->botToken)) {
            return [];
        }

        try {
            $response = Http::timeout(10)
                ->get("https://api.telegram.org/bot{$this->botToken}/getUpdates");

            if ($response->successful()) {
                return $response->json('result', []);
            }
        } catch (\Throwable $e) {
            Log::error('TelegramService: getUpdates failed: ' . $this->redact($e->getMessage()));
        }

        return [];
    }

    /**
     * Redact the bot token from any string before it reaches the logs.
     * Guzzle/cURL exception messages can embed the full request URL
     * (which contains the token) — this prevents leaking it.
     */
    protected function redact(string $message): string
    {
        if (empty($this->botToken)) {
            return $message;
        }

        return str_replace($this->botToken, '***REDACTED***', $message);
    }
}
