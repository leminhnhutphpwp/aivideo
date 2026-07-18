<?php

namespace App\Services;

use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\User;

/**
 * Per-user daily render cap. Free plans get a generous credit grant, so without a daily
 * ceiling a single account could farm renders and burn real provider (Wan) money. This
 * counts both single render jobs and storyboard renders started "today" (app timezone).
 *
 * The cap lives on Plan::max_renders_per_day (null = unlimited). Retries of an already-
 * counted generation are NOT re-counted here — they are separately capped by
 * RenderJob::max_attempts and config('storyboard.max_render_attempts').
 */
class RenderQuotaService
{
    /**
     * Daily render limit for this user, or null for unlimited.
     */
    public function limitFor(User $user): ?int
    {
        $plan = $user->plan;

        if (! $plan) {
            return (int) config('render.default_max_per_day', 10);
        }

        // null column = unlimited (e.g. Studio / internal plans)
        return $plan->max_renders_per_day;
    }

    /**
     * Number of renders the user has started since the start of today (app timezone).
     */
    public function usedToday(User $user): int
    {
        $start = now()->startOfDay();

        $jobs = RenderJob::where('user_id', $user->id)
            ->where('created_at', '>=', $start)
            ->count();

        // Storyboard single_flow renders call the daemon directly (no RenderJob row),
        // so count storyboards whose render was kicked off today. Use last_rendered_at
        // (set only on a real render kickoff) — NOT updated_at, which also bumps when the
        // user merely edits the title, wrongly inflating the daily count.
        $storyboards = Storyboard::where('user_id', $user->id)
            ->whereNotNull('last_rendered_at')
            ->where('last_rendered_at', '>=', $start)
            ->count();

        return $jobs + $storyboards;
    }

    /**
     * Whether the user has hit their daily render cap.
     */
    public function exceeded(User $user): bool
    {
        $limit = $this->limitFor($user);

        if ($limit === null) {
            return false;
        }

        return $this->usedToday($user) >= $limit;
    }

    /**
     * User-facing Vietnamese message when the cap is reached.
     */
    public function limitMessage(User $user): string
    {
        $limit = $this->limitFor($user);

        return "Bạn đã đạt giới hạn tạo video trong ngày ({$limit}). "
            . 'Vui lòng thử lại vào ngày mai hoặc nâng cấp gói để tạo nhiều hơn.';
    }
}
