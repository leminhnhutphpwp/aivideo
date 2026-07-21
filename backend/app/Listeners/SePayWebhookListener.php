<?php
namespace App\Listeners;

use App\Models\CreditTransaction;
use App\Models\PendingCreditPurchase;
use App\Models\PlanUpgrade;
use App\Models\User;
use App\Services\CreditService;
use Illuminate\Support\Facades\DB;
use SePay\SePay\Events\SePayWebhookEvent;

class SePayWebhookListener
{
    public function __construct(
        protected CreditService $creditService
    ) {}

    public function handle(SePayWebhookEvent $event): void
    {
        $data = $event->sePayWebhookData;

        if ($data->transferType !== 'in') return;

        $content = trim($data->description ?? $data->content ?? '');

        // Idempotency: check referenceCode
        if ($this->isAlreadyProcessed($data->referenceCode)) return;

        // Check Plan Upgrade first (NA{code})
        if (str_starts_with($content, 'NA') && $this->handlePlanUpgrade($content, $data)) {
            return;
        }

        // Handle Credits Purchase (DH{code})
        if (str_starts_with($content, 'DH')) {
            $this->handleCreditsPurchase($content, $data);
        }
    }

    protected function isAlreadyProcessed(string $referenceCode): bool
    {
        if (empty($referenceCode)) return false;

        // Indexed exact-match idempotency (was a LIKE %code% full-scan on `description`).
        return
            CreditTransaction::where('reference_code', $referenceCode)->exists() ||
            PlanUpgrade::where('reference_code', $referenceCode)->exists() ||
            PendingCreditPurchase::where('reference_code', $referenceCode)->exists();
    }

    protected function handlePlanUpgrade(string $content, $data): bool
    {
        $transferCode = $content; // e.g. NAA1B2C3D4

        $upgrade = PlanUpgrade::where('transfer_code', $transferCode)
            ->where('status', PlanUpgrade::STATUS_PENDING)
            ->first();

        if (!$upgrade) return false;

        // Verify amount (allow 1% tolerance for bank fees)
        $minExpected = (int) ($upgrade->amount * 0.99);
        $maxExpected = (int) ($upgrade->amount * 1.01);
        if ($data->transferAmount < $minExpected || $data->transferAmount > $maxExpected) {
            \Illuminate\Support\Facades\Log::warning('SePay plan upgrade amount mismatch', [
                'transfer_code' => $transferCode,
                'expected' => $upgrade->amount,
                'received' => $data->transferAmount,
            ]);
            return false;
        }

        $user = $upgrade->user;

        // Process the upgrade
        DB::transaction(function () use ($upgrade, $user, $data) {
            $upgrade->update([
                'status' => PlanUpgrade::STATUS_PAID,
                'reference_code' => $data->referenceCode,
            ]);

            $now = now();
            $expiresAt = $now->copy()->addMonth();

            $user->update([
                'plan_id' => $upgrade->to_plan_id,
                'plan_expires_at' => $expiresAt,
            ]);

            $user->subscriptions()->create([
                'plan_id' => $upgrade->to_plan_id,
                'status' => \App\Models\Subscription::STATUS_ACTIVE,
                'started_at' => $now,
                'expires_at' => $expiresAt,
            ]);

            $toPlan = $upgrade->toPlan;
            if ($toPlan && $toPlan->effective_credits > 0) {
                $this->creditService->addCredits(
                    $user,
                    $toPlan->effective_credits,
                    "Đăng ký gói {$toPlan->name} lần đầu",
                    $data->referenceCode
                );
            }
        });

        // Send notification email
        $toPlan = $upgrade->toPlan;
        app(\App\Services\MailService::class)->sendToUser('plan_upgraded', $user, [
            'from_plan' => $upgrade->fromPlan?->name ?? 'Free',
            'to_plan' => $toPlan?->name ?? 'Unknown',
            'login_url' => url('/login'),
        ]);

        return true;
    }

    protected function handleCreditsPurchase(string $content, $data): void
    {
        $transferCode = $content; // e.g. DHA1B2C3D4

        $pending = PendingCreditPurchase::where('transfer_code', $transferCode)
            ->where('status', 'pending')
            ->first();

        if (!$pending) return;

        // Verify amount matches (allow 1% tolerance for bank fees — matches the
        // plan-upgrade path; 5% previously let a transfer up to 5% short grant
        // full credits). Reversible business tweak.
        $minExpected = (int) ($pending->amount * 0.99);
        $maxExpected = (int) ($pending->amount * 1.01);
        if ($data->transferAmount < $minExpected || $data->transferAmount > $maxExpected) {
            \Illuminate\Support\Facades\Log::warning('SePay credit purchase amount mismatch', [
                'transfer_code' => $transferCode,
                'expected' => $pending->amount,
                'received' => $data->transferAmount,
            ]);
            return;
        }

        $user = $pending->user;

        // Mark as paid and add credits atomically. Lock the pending row and
        // re-assert status==='pending' AFTER acquiring the lock so concurrent
        // SePay retries can't both credit — the loser sees status='paid' and
        // skips. The UNIQUE index on reference_code is the final backstop.
        $credited = DB::transaction(function () use ($pending, $user, $data) {
            $locked = PendingCreditPurchase::whereKey($pending->id)
                ->lockForUpdate()
                ->first();

            if (!$locked || $locked->status !== 'pending') {
                return false; // already paid by a concurrent webhook — no double credit
            }

            $locked->update([
                'status' => 'paid',
                'reference_code' => $data->referenceCode,
            ]);

            $this->creditService->addCredits(
                $user,
                $locked->credits,
                "SEPay nạp {$data->transferAmount}đ - {$locked->transfer_code} - {$data->gateway} - {$data->referenceCode}",
                $data->referenceCode
            );

            return true;
        });

        if (!$credited) return;

        // Chốt lượt coupon giảm giá (nếu đơn có áp mã).
        app(\App\Services\CouponService::class)->completeForPurchase($pending);
    }
}
