<?php

namespace App\Events;

use App\Models\Storyboard;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;

class StoryboardProgressUpdated implements ShouldBroadcast
{
    use Dispatchable;

    public function __construct(
        public Storyboard $storyboard
    ) {}

    public function broadcastOn(): Channel
    {
        return new PrivateChannel("storyboard.{$this->storyboard->uuid}");
    }

    public function broadcastAs(): string
    {
        return 'storyboard.progress.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'uuid' => $this->storyboard->uuid,
            'status' => $this->storyboard->status,
            'progress_message' => $this->storyboard->progress_message,
            'updated_at' => $this->storyboard->updated_at?->toIso8601String(),
        ];
    }
}
