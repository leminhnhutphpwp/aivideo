<?php

namespace App\Policies;

use App\Models\Report;
use App\Models\User;

/**
 * Reports are moderation records visible only to administrators. Regular users must never
 * view, resolve, or dismiss reports. The Filament panel gate (User::canAccessPanel) already
 * blocks non-admins from reaching the panel; this policy is defense-in-depth so any direct
 * authorize('...') check on Report also requires super_admin.
 */
class ReportPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    public function view(User $user, Report $report): bool
    {
        return $user->hasRole('super_admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('super_admin');
    }

    public function update(User $user, Report $report): bool
    {
        return $user->hasRole('super_admin');
    }

    public function delete(User $user, Report $report): bool
    {
        return $user->hasRole('super_admin');
    }

    public function deleteAny(User $user): bool
    {
        return $user->hasRole('super_admin');
    }
}
