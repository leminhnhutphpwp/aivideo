<?php

namespace App\Events;

use App\Models\RenderJob;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class JobProgress implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public RenderJob $renderJob,
        public int $progress,
        public string $stage
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("user.{$this->renderJob->user->uuid}");
    }

    public function broadcastAs(): string
    {
        return 'job.progress';
    }

    public function broadcastWith(): array
    {
        return [
            'job_id' => $this->renderJob->uuid,
            'progress' => $this->progress,
            'stage' => $this->stage,
        ];
    }
}
