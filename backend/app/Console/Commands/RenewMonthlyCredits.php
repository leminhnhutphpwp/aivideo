<?php
namespace App\Console\Commands;

use App\Models\User;
use App\Services\CreditService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RenewMonthlyCredits extends Command
{
    protected $signature = 'credits:renew';

    protected $description = 'Gia hạn credits hàng tháng cho user có gói trả phí';

    public function handle(CreditService $creditService): int
    {
        $count = 0;

        User::query()
            ->with('plan')
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
                            "Gia hạn credits tháng {$plan->name}"
                        );
                        $user->update(['credits_renewed_at' => now()]);
                    });
                    $count++;
                }
            });

        $this->info("Đã gia hạn credits cho {$count} người dùng.");
        return Command::SUCCESS;
    }
}
