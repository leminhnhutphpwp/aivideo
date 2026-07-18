<?php

namespace App\Services;

use App\Settings\TelegramSettings;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected ?string $botToken = null;
    protected array $chatIds = [];

    public function __construct()
    {
        try {
            $settings = app(TelegramSettings::class);
            $this->botToken = $settings->bot_token ?: config('telegram.bot_token');
            $this->chatIds = $settings->chat_ids ?: [];
        } catch (\Throwable $e) {
            Log::warning('TelegramService: Failed to load settings: ' . $e->getMessage());
        }
    }

    public function isConfigured(): bool
    {
        return !empty($this->botToken) && !empty($this->chatIds);
    }

    public function sendMessage(string $message): bool
    {
        if (!$this->isConfigured()) {
            Log::warning('TelegramService: Bot not configured, skipping message');
            return false;
        }

        $success = true;
        foreach ($this->chatIds as $chatId) {
            try {
                $response = Http::timeout(10)
                    ->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                        'chat_id' => trim($chatId),
                        'text' => $message,
                        'parse_mode' => 'HTML',
                        'disable_web_page_preview' => true,
                    ]);

                if (!$response->successful()) {
                    Log::error("TelegramService: Failed to send to {$chatId}: " . $response->body());
                    $success = false;
                }
            } catch (\Throwable $e) {
                Log::error("TelegramService: Exception sending to {$chatId}: " . $e->getMessage());
                $success = false;
            }
        }

        return $success;
    }

    public function sendPhotoWithCaption(string $photoUrl, string $caption): bool
    {
        if (!$this->isConfigured()) {
            Log::warning('TelegramService: Bot not configured, skipping photo message');
            return false;
        }

        $success = true;
        foreach ($this->chatIds as $chatId) {
            try {
                $response = Http::timeout(15)
                    ->post("https://api.telegram.org/bot{$this->botToken}/sendPhoto", [
                        'chat_id' => trim($chatId),
                        'photo' => $photoUrl,
                        'caption' => $caption,
                        'parse_mode' => 'HTML',
                    ]);

                if (!$response->successful()) {
                    Log::error("TelegramService: Failed to send photo to {$chatId}: " . $response->body());
                    $success = false;
                }
            } catch (\Throwable $e) {
                Log::error("TelegramService: Exception sending photo to {$chatId}: " . $e->getMessage());
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

    public function getBotInfo(): ?array
    {
        if (empty($this->botToken)) {
            return null;
        }

        try {
            $response = Http::timeout(5)
                ->get("https://api.telegram.org/bot{$this->botToken}/getMe");

            if ($response->successful()) {
                return $response->json('result');
            }
        } catch (\Throwable $e) {
            Log::error("TelegramService: getMe failed: " . $e->getMessage());
        }

        return null;
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
            Log::error("TelegramService: getUpdates failed: " . $e->getMessage());
        }

        return [];
    }
}

