<?php
namespace App\Console\Commands;

use App\Models\User;
use App\Services\CreditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AutoRenewCredits extends Command
{
    protected $signature = 'credits:auto-renew';

    protected $description = 'Tự động gia hạn credits cho user có bật auto_renew';

    public function handle(CreditService $creditService): int
    {
        $count = 0;

        User::query()
            ->with('plan')
            ->where('auto_renew', true)
            ->whereHas('plan', fn ($q) => $q->where('monthly_credits', '>', 0))
            ->where(function ($q) {
                $q->whereNull('plan_expires_at')
                  ->orWhere('plan_expires_at', '>', now());
            })
            ->where(function ($q) {
                $q->whereNull('credits_renewed_at')
                  ->orWhere('credits_renewed_at', '<', now()->startOfMonth());
            })
            ->chunk(100, function ($users) use ($creditService, &$count) {
                foreach ($users as $user) {
                    $plan = $user->plan;
                    if (!$plan || $plan->monthly_credits <= 0) continue;

                    DB::transaction(function () use ($user, $plan, $creditService) {
                        $creditService->addCredits(
                            $user,
                            $plan->monthly_credits,
                            "Tự động gia hạn credits tháng {$plan->name}"
                        );
                        $user->update(['credits_renewed_at' => now()]);
                    });
                    $count++;
                }
            });

        $this->info("Đã tự động gia hạn credits cho {$count} người dùng.");
        return Command::SUCCESS;
    }
}
