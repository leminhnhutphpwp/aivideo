<?php

namespace App\Jobs;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckExpiredSubscriptions implements ShouldQueue
{
    use Queueable;

    private const GRACE_DAYS = 7;
    private const GRACE_REMINDER_DAYS = 3;

    public function handle(): void
    {
        $freePlan = Plan::where('slug', 'free')->first();
        if (!$freePlan) return;

        $this->sendGraceReminders($freePlan);
        $this->downgradeExpired($freePlan);
    }

    protected function sendGraceReminders(Plan $freePlan): void
    {
        // Users past expiry but not yet downgraded (still on premium plan or already on free)
        $inGrace = User::query()
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '<', now())
            ->get();

        foreach ($inGrace as $user) {
            // Carbon 3: diff là số có dấu. plan_expires_at đã ở quá khứ nên cần trị
            // tuyệt đối để có "số ngày kể từ khi hết hạn" luôn dương.
            $daysSinceExpiry = (int) $user->plan_expires_at->diffInDays(now(), true);

            // Send reminder at day 3 of grace period
            if ($daysSinceExpiry === self::GRACE_REMINDER_DAYS) {
                $this->sendReminderEmail($user);
            }
        }
    }

    protected function downgradeExpired(Plan $freePlan): void
    {
        // Downgrade anyone with an expired plan_expires_at, regardless of current plan_id.
        // This handles users who never completed setup or have stale plan_id.
        $expired = User::query()
            ->whereNotNull('plan_expires_at')
            ->where('plan_expires_at', '<', now()->subDays(self::GRACE_DAYS))
            ->get();

        $count = 0;
        foreach ($expired as $user) {
            $oldPlanName = $user->plan?->name ?? 'Unknown';

            $user->update([
                'plan_id' => $freePlan->id,
                'plan_expires_at' => null,
            ]);

            app(\App\Services\MailService::class)->sendToUser('plan_expired', $user, [
                'old_plan' => $oldPlanName,
                'login_url' => rtrim(config('app.frontend_url'), '/') . '/login',
            ]);

            $count++;
        }

        if ($count > 0) {
            info("Downgraded {$count} expired subscriptions to free plan");
        }
    }

    protected function sendReminderEmail(User $user): void
    {
        app(\App\Services\MailService::class)->sendToUser('plan_expiry_reminder', $user, [
            'plan_name' => $user->plan?->name ?? 'Unknown',
            'expiry_date' => $user->plan_expires_at?->format('d/m/Y') ?? 'N/A',
            'grace_end' => $user->plan_expires_at?->addDays(self::GRACE_DAYS)->format('d/m/Y') ?? 'N/A',
            'login_url' => rtrim(config('app.frontend_url'), '/') . '/login',
        ]);
    }
}
