<?php
namespace App\Services;

use App\Models\CreditTransaction;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreditService
{
    public function __construct(
        private MailService $mailService
    ) {}

    public function canAfford(User $user, int $cost): bool
    {
        return $user->hasEnoughCredits($cost);
    }

    public function reserve(User $user, int $cost, ?RenderJob $job = null, ?Storyboard $storyboard = null): bool
    {
        return DB::transaction(function () use ($user, $cost, $job, $storyboard) {
            $fresh = User::where('id', $user->id)->lockForUpdate()->first();
            if (!$fresh || $fresh->credits < $cost) return false;

            $affected = User::where('id', $user->id)
                ->where('credits', '>=', $cost)
                ->decrement('credits', $cost);

            if (!$affected) return false;

            CreditTransaction::create([
                'user_id' => $user->id,
                'type' => 'reserved',
                'amount' => -$cost,
                'balance_before' => $fresh->credits,
                'balance_after' => $fresh->credits - $cost,
                'render_job_id' => $job?->id,
                'storyboard_id' => $storyboard?->id,
                'description' => $this->buildDescription('Dùng credits tạo video', $job, $storyboard),
            ]);

            return true;
        });
    }

    public function captureReserved(RenderJob $job): void
    {
        DB::transaction(function () use ($job) {
            $txns = CreditTransaction::where('render_job_id', $job->id)
                ->where('type', 'reserved')
                ->get();

            foreach ($txns as $txn) {
                $txn->update(['type' => 'usage']);
            }

            // Track tổng credits đã dùng
            $totalCost = $txns->sum('amount');
            $job->user()->increment('credits_total_used', abs($totalCost));
        });
    }

    public function releaseReserved(RenderJob $job): void
    {
        $totalRefund = 0;

        DB::transaction(function () use ($job, &$totalRefund) {
            // Lock the reserved rows so overlapping release paths (timeout sweep,
            // stuck-credit release, failure webhook, retry) can't double-refund.
            // A concurrent call blocks here, then re-reads type='refunded' → empty
            // set → refunds 0. The WHERE type='reserved' is the re-check.
            $txns = CreditTransaction::where('render_job_id', $job->id)
                ->where('type', 'reserved')
                ->lockForUpdate()
                ->get();

            foreach ($txns as $txn) {
                $user = $job->user;
                $amount = abs($txn->amount);
                $user->increment('credits', $amount);
                $txn->update(['type' => 'refunded']);

                CreditTransaction::create([
                    'user_id' => $user->id,
                    'type' => 'refund',
                    'amount' => $amount,
                    'balance_before' => $user->credits - $amount,
                    'balance_after' => $user->credits,
                    'description' => $this->buildRefundDescription($job),
                ]);

                $totalRefund += $amount;
            }
        });

        if ($totalRefund > 0) {
            $this->mailService->sendToUser('credits_refunded', $job->user, [
                'amount' => (string) $totalRefund,
                'balance' => (string) $job->user->credits,
                'job_name' => $job->title ?: "Job #{$job->uuid}",
            ]);
        }
    }

    public function captureStoryboardReserved(Storyboard $storyboard): void
    {
        DB::transaction(function () use ($storyboard) {
            $txns = CreditTransaction::where('storyboard_id', $storyboard->id)
                ->where('type', 'reserved')
                ->get();

            foreach ($txns as $txn) {
                $txn->update(['type' => 'usage']);
            }

            $totalCost = $txns->sum('amount');
            $storyboard->user()->increment('credits_total_used', abs($totalCost));
        });
    }

    public function releaseStoryboardReserved(Storyboard $storyboard): void
    {
        $totalRefund = 0;

        DB::transaction(function () use ($storyboard, &$totalRefund) {
            // Lock reserved rows so overlapping release paths can't double-refund.
            // Concurrent call blocks, then re-reads type='refunded' → empty → 0.
            $txns = CreditTransaction::where('storyboard_id', $storyboard->id)
                ->where('type', 'reserved')
                ->lockForUpdate()
                ->get();

            foreach ($txns as $txn) {
                $user = $storyboard->user;
                $amount = abs($txn->amount);
                $user->increment('credits', $amount);
                $txn->update(['type' => 'refunded']);

                CreditTransaction::create([
                    'user_id' => $user->id,
                    'storyboard_id' => $storyboard->id,
                    'type' => 'refund',
                    'amount' => $amount,
                    'balance_before' => $user->credits - $amount,
                    'balance_after' => $user->credits,
                    'description' => $this->buildRefundDescription($storyboard),
                ]);

                $totalRefund += $amount;
            }
        });

        if ($totalRefund > 0) {
            $this->mailService->sendToUser('credits_refunded', $storyboard->user, [
                'amount' => (string) $totalRefund,
                'balance' => (string) $storyboard->user->credits,
                'job_name' => $storyboard->title ?: "Storyboard #{$storyboard->uuid}",
            ]);
        }
    }

    public function addCredits(User $user, int $amount, string $description, ?string $referenceCode = null, string $type = 'purchase'): CreditTransaction
    {
        $transaction = DB::transaction(function () use ($user, $amount, $description, $referenceCode, $type) {
            $balanceBefore = $user->credits;
            $user->increment('credits', $amount);
            $user->refresh();
            return CreditTransaction::create([
                'user_id' => $user->id,
                'type' => $type,
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $user->credits,
                'description' => $description,
                'reference_code' => $referenceCode,
            ]);
        });

        if ($amount > 0) {
            $this->mailService->sendToUser('credits_added', $user, [
                'amount' => (string) $amount,
                'balance' => (string) $user->credits,
                'description' => $description,
            ]);
        }

        return $transaction;
    }

    private function buildDescription(string $prefix, ?RenderJob $job = null, ?Storyboard $storyboard = null): string
    {
        $title = $job?->title ?? $storyboard?->title ?? '';

        if ($title) {
            $shortTitle = mb_strlen($title) > 60 ? mb_substr($title, 0, 57) . '...' : $title;
            return "{$prefix} — {$shortTitle}";
        }

        return $prefix;
    }

    private function buildRefundDescription(RenderJob|Storyboard $entity): string
    {
        $title = $entity->title ?? '';

        if ($title) {
            $shortTitle = mb_strlen($title) > 60 ? mb_substr($title, 0, 57) . '...' : $title;
            return "Hoàn credits — {$shortTitle}";
        }

        return 'Hoàn credits — video thất bại';
    }
}
