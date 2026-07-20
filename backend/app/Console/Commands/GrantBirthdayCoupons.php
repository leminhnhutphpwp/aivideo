<?php

namespace App\Console\Commands;

use App\Models\CouponEvent;
use App\Models\User;
use App\Services\CouponEventService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class GrantBirthdayCoupons extends Command
{
    protected $signature = 'events:grant-birthday';

    protected $description = 'Tặng credits sinh nhật cho user có ngày sinh hôm nay';

    public function handle(CouponEventService $service): int
    {
        if (! CouponEvent::active()->where('trigger', CouponEvent::TRIGGER_BIRTHDAY)->exists()) {
            $this->info('Không có event sinh nhật đang bật.');

            return Command::SUCCESS;
        }

        $granted = 0;
        $skipped = 0;
        $failed = 0;

        User::query()
            ->whereNotNull('date_of_birth')
            ->where('is_active', true)
            ->whereNotNull('email_verified_at')
            ->whereMonth('date_of_birth', now()->month)
            ->whereDay('date_of_birth', now()->day)
            ->chunkById(200, function ($users) use ($service, &$granted, &$skipped, &$failed) {
                foreach ($users as $user) {
                    try {
                        $coupon = $service->grantBirthdayFor($user);
                        if ($coupon) {
                            $granted++;
                        } else {
                            $skipped++;
                        }
                    } catch (\Throwable $e) {
                        $failed++;
                        Log::warning('Birthday coupon grant failed', [
                            'user_id' => $user->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });

        $this->info("Sinh nhật: {$granted} đã tặng, {$skipped} bỏ qua, {$failed} lỗi.");

        return Command::SUCCESS;
    }
}
