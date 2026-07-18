<?php
namespace App\Services;

use App\Exceptions\ValidationResult;
use App\Models\User;

class PlanValidationService
{
    public function validateUsage(User $user): ValidationResult
    {
        $plan = $user->plan;
        $errors = [];

        $activeCount = $user->renderJobs()
            ->whereIn('status', ['queued', 'rendering'])
            ->count();

        if ($activeCount >= $plan->max_concurrent_jobs) {
            $errors[] = "Maximum concurrent jobs reached ({$plan->max_concurrent_jobs})";
        }

        $monthlyUsage = $user->renderJobs()
            ->where('created_at', '>=', now()->startOfMonth())
            ->where('status', 'completed')
            ->sum('credits_cost');

        if ($monthlyUsage >= $plan->effective_credits) {
            $errors[] = 'Monthly credit limit reached';
        }

        return new ValidationResult(empty($errors), $errors);
    }
}
