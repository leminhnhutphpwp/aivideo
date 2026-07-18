<?php
namespace App\Policies;

use App\Models\Asset;
use App\Models\User;

class AssetPolicy
{
    public function view(User $user, Asset $asset): bool
    {
        return $user->id === $asset->user_id
            || $user->hasRole('super_admin')
            || (bool) $asset->renderJob?->isPublished();
    }

    public function delete(User $user, Asset $asset): bool
    {
        return $user->id === $asset->user_id || $user->hasRole('super_admin');
    }
}
