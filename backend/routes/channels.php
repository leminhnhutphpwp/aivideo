<?php

use App\Models\Storyboard;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{uuid}', function (User $user, string $uuid) {
    return $user->uuid === $uuid;
});

Broadcast::channel('storyboard.{uuid}', function (User $user, string $uuid) {
    $storyboard = Storyboard::where('uuid', $uuid)->first();
    if (!$storyboard) return false;
    return ['id' => $storyboard->user_id === $user->id];
});
