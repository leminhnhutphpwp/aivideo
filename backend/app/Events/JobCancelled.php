<?php

namespace App\Events;

use App\Models\RenderJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class JobCancelled implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(public RenderJob $renderJob) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("user.{$this->renderJob->user->uuid}");
    }

    public function broadcastAs(): string
    {
        return 'job.cancelled';
    }
}
