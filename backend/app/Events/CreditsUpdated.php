<?php

namespace App\Events;

use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class CreditsUpdated implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(public User $user) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("user.{$this->user->uuid}");
    }

    public function broadcastAs(): string
    {
        return 'credits.updated';
    }

    public function broadcastWith(): array
    {
        return ['balance' => $this->user->credits];
    }
}
