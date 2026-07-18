<?php

namespace App\Events;

use App\Http\Resources\RenderJobResource;
use App\Models\RenderJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class JobQueued implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(public RenderJob $renderJob) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("user.{$this->renderJob->user->uuid}");
    }

    public function broadcastAs(): string
    {
        return 'job.queued';
    }

    public function broadcastWith(): array
    {
        return ['job' => (new RenderJobResource($this->renderJob))->toArray(
            request() ?: \Illuminate\Support\Facades\Request::create('', 'GET')
        )];
    }
}
