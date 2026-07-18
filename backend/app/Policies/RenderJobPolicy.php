<?php
namespace App\Policies;

use App\Models\RenderJob;
use App\Models\User;

class RenderJobPolicy
{
    public function view(User $user, RenderJob $renderJob): bool
    {
        return $user->id === $renderJob->user_id || $user->hasRole('super_admin');
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, RenderJob $renderJob): bool
    {
        return $user->id === $renderJob->user_id || $user->hasRole('super_admin');
    }

    public function delete(User $user, RenderJob $renderJob): bool
    {
        return $user->id === $renderJob->user_id || $user->hasRole('super_admin');
    }

    public function publish(User $user, RenderJob $renderJob): bool
    {
        if ($user->id !== $renderJob->user_id) {
            return false;
        }

        if ($renderJob->status !== 'completed') {
            return false;
        }

        if (!$user->isPro()) {
            return false;
        }

        return true;
    }
}
