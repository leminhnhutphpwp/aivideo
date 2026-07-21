<?php
namespace App\Jobs;

use App\Models\RenderJob;
use App\Services\CreditService;
use App\Services\MailService;
use App\Events\JobFailed;
use App\Events\CreditsUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;

class HandleJobFailure implements ShouldQueue
{
    use Queueable;

    // Lỗi từ provider — admin cần biết chi tiết
    private const CRITICAL_ERROR_CODES = [
        'AllocationQuota.FreeTierOnly',
        'AllocationQuota.InsufficientBalance',
        'AccountSuspended',
        'ModelDeprecated',
        'InvalidApiKey',
    ];

    // Log thật cho admin, user thấy message chung
    private const FRIENDLY_MESSAGE = 'Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.';

    public function __construct(
        public RenderJob $renderJob,
        public string $error,
        public ?string $errorCode = null,
        public ?string $rawErrorMessage = null,
    ) {}

    public function handle(CreditService $creditService, MailService $mailService): void
    {
        if ($this->renderJob->isTerminal()) return;

        $rawError = $this->rawErrorMessage ?: $this->error;

        Log::warning('Render job failed', [
            'job_uuid' => $this->renderJob->uuid,
            'error_code' => $this->errorCode ?? 'UNKNOWN',
            'raw_error' => $rawError,
            'model' => $this->renderJob->model,
            'provider' => $this->extractProvider(),
        ]);

        if ($this->errorCode && in_array($this->errorCode, self::CRITICAL_ERROR_CODES)) {
            Log::critical('Provider quota/billing error — admin action required', [
                'job_uuid' => $this->renderJob->uuid,
                'error_code' => $this->errorCode,
                'raw_error' => $rawError,
                'model' => $this->renderJob->model,
            ]);
        }

        $creditService->releaseReserved($this->renderJob);
        $this->renderJob->markAsFailed(self::FRIENDLY_MESSAGE);

        // Store real error for admin debugging (user sees friendly message above)
        $this->renderJob->update([
            'error_metadata' => array_filter([
                'error_code' => $this->errorCode,
                'raw_error' => $rawError,
                'provider' => $this->extractProvider(),
            ]),
        ]);

        JobFailed::dispatch($this->renderJob);
        CreditsUpdated::dispatch($this->renderJob->user);

        $sendEmail = true;
        $pref = $this->renderJob->user->notificationPreferences()
            ->where('type', 'job_failed')
            ->where('channel', 'email')
            ->first();
        if ($pref && !$pref->enabled) {
            $sendEmail = false;
        }

        if ($sendEmail) {
            $mailService->sendToUser('job_failed', $this->renderJob->user, [
                'job_name' => $this->renderJob->uuid,
                'error_reason' => self::FRIENDLY_MESSAGE,
            ]);
        }
    }

    /**
     * Default queue tries=1: one shot at cleanup if handle() throws before the
     * terminal transition (e.g. after releaseReserved but before markAsFailed, or
     * before either). Guarantee reserved credits are freed and the job lands in a
     * terminal state so it can't strand in 'processing'. releaseReserved is
     * idempotent (only refunds type='reserved' rows) → safe to call again.
     */
    public function failed(\Throwable $e): void
    {
        try {
            app(CreditService::class)->releaseReserved($this->renderJob);
            if (! $this->renderJob->fresh()?->isTerminal()) {
                $this->renderJob->markAsFailed(self::FRIENDLY_MESSAGE);
            }
        } catch (\Throwable $inner) {
            Log::error('HandleJobFailure::failed cleanup error', [
                'job_uuid' => $this->renderJob->uuid,
                'error' => $inner->getMessage(),
            ]);
        }
    }

    private function extractProvider(): string
    {
        $model = $this->renderJob->model ?? '';
        foreach (['volcengine', 'wavespeed', 'qwencloud', 'byteplus', 'openai', 'grok', 'elevenlabs', 'nanobanana', 'imagerouter'] as $p) {
            if (str_contains($model, $p)) return $p;
        }
        return 'unknown';
    }
}
