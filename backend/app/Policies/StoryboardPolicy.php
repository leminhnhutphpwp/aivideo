<?php

namespace App\Policies;

use App\Models\Storyboard;
use App\Models\User;

class StoryboardPolicy
{
    public function update(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function delete(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function cancel(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function render(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function analyze(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function compilePrompt(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function addVoiceover(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }

    public function download(User $user, Storyboard $storyboard): bool
    {
        return $user->id === $storyboard->user_id;
    }
}
