<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\RenderJob;
use App\Models\Comment;
use App\Models\Follow;

class UserNotificationService
{
    public function notifyLike(User $actor, RenderJob $job): void
    {
        if ($actor->id === $job->user_id) return;

        $notification = Notification::create([
            'title' => 'Lượt thích mới',
            'body' => "{$actor->name} đã thích tác phẩm của bạn",
            'type' => 'success',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($job->user_id, [
            'read' => false,
        ]);
    }

    public function notifyComment(User $actor, Comment $comment): void
    {
        $job = $comment->renderJob;
        if ($actor->id === $job->user_id) return;

        $notification = Notification::create([
            'title' => 'Bình luận mới',
            'body' => "{$actor->name} đã bình luận về tác phẩm của bạn",
            'type' => 'info',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($job->user_id, [
            'read' => false,
        ]);
    }

    public function notifyFollow(User $actor, User $target): void
    {
        if ($actor->id === $target->id) return;

        $notification = Notification::create([
            'title' => 'Follower mới',
            'body' => "{$actor->name} đã theo dõi bạn",
            'type' => 'info',
            'audience' => 'specific',
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $notification->users()->attach($target->id, [
            'read' => false,
        ]);
    }
}
