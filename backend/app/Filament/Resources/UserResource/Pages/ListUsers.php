<?php

namespace App\Filament\Resources\UserResource\Pages;

use App\Filament\Resources\UserResource;
use App\Services\CreditService;
use Filament\Actions;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\ListRecords;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
            Actions\Action::make('renew_all')
                ->label('Gia hạn tất cả')
                ->icon('heroicon-o-arrow-path')
                ->color('info')
                ->requiresConfirmation()
                ->modalHeading('Gia hạn credits hàng tháng')
                ->modalDescription('Gia hạn credits cho tất cả tài khoản có gói trả phí chưa được gia hạn trong tháng này?')
                ->action(function (CreditService $creditService) {
                    $count = 0;
                    $users = \App\Models\User::query()
                        ->with('plan')
                        ->whereHas('plan', fn ($q) => $q->where('monthly_credits', '>', 0))
                        ->where(function ($q) {
                            $q->whereNull('credits_renewed_at')
                              ->orWhere('credits_renewed_at', '<', now()->startOfMonth());
                        })
                        ->get();

                    foreach ($users as $user) {
                        $plan = $user->plan;
                        if (!$plan || $plan->monthly_credits <= 0) continue;
                        $creditService->addCredits($user, $plan->monthly_credits, "Gia hạn credits tháng {$plan->name}");
                        $user->update(['credits_renewed_at' => now()]);
                        $count++;
                    }

                    Notification::make()
                        ->title("Đã gia hạn credits cho {$count} tài khoản!")
                        ->success()
                        ->send();
                }),
        ];
    }
}
