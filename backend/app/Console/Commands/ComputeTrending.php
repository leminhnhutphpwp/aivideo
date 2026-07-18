<?php

namespace App\Console\Commands;

use App\Models\Like;
use App\Models\RenderJob;
use App\Settings\CommunitySettings;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class ComputeTrending extends Command
{
    protected $signature = 'trending:compute';

    protected $description = 'Compute trending assets and creators, cache for 15 min';

    public function handle(): void
    {
        $settings = app(CommunitySettings::class);

        foreach (['day', 'week', 'month'] as $period) {
            $since = match ($period) {
                'week' => now()->subDays(7),
                'month' => now()->subDays(30),
                default => now()->subDay(),
            };

            $jobs = RenderJob::published()
                ->where('published_at', '>=', $since)
                ->with('assets:id,uuid')
                ->withCount('likes')
                ->get()
                ->map(function ($job) use ($settings) {
                    $score = ($job->likes_count * $settings->like_weight)
                        + ($job->usage_count * $settings->view_weight);
                    $job->trending_score = $score;
                    return $job;
                })
                ->sortByDesc('trending_score')
                ->take($settings->trending_limit);

            Cache::put("trending:assets:{$period}", $jobs->map(function ($job) {
                $likeCount = $job->likes_count ?? Like::where('render_job_id', $job->id)->count();
                $asset = $job->assets()->first();
                $outputUrl = $asset?->url ?? $job->output_path;
                return [
                    'uuid' => $job->uuid,
                    'title' => $job->title ?? mb_substr($job->prompt ?? '', 0, 60),
                    'prompt' => $job->prompt,
                    'output_path' => $outputUrl,
                    'thumbnail_path' => $job->thumbnail_path,
                    'preview_path' => $job->preview_path,
                    'aspect_ratio' => $job->aspect_ratio,
                    'resolution' => $job->resolution,
                    'duration_seconds' => $job->duration_seconds,
                    'credits_cost' => $job->credits_cost,
                    'visibility' => $job->visibility,
                    'tags' => $job->tags ?? [],
                    'like_count' => $likeCount,
                    'usage_count' => $job->usage_count,
                    'published_at' => $job->published_at?->toIso8601String(),
                    'user' => $job->user ? [
                        'name' => $job->user->name,
                        'username' => $job->user->username,
                        'avatar_url' => $job->user->avatar,
                        'reputation_level' => $job->user->reputation_level,
                    ] : null,
                ];
            })->values(), 900);

            // Top creators
            $creators = \App\Models\User::whereHas('renderJobs', function ($q) use ($since) {
                $q->whereIn('visibility', ['sharing', 'public'])
                  ->where('published_at', '>=', $since);
            })
            ->withCount(['renderJobs as published_count' => function ($q) use ($since) {
                $q->whereIn('visibility', ['sharing', 'public'])
                  ->where('published_at', '>=', $since);
            }])
            ->orderByDesc('published_count')
            ->take($settings->top_creators_limit)
            ->get()
            ->map(function ($user) {
                return [
                    'uuid' => $user->uuid,
                    'name' => $user->name,
                    'username' => $user->username,
                    'avatar_url' => $user->avatar,
                    'reputation_level' => $user->reputation_level,
                    'published_count' => $user->published_count,
                ];
            });

            Cache::put("trending:creators:{$period}", $creators, 900);
        }

        $this->info('Trending computed and cached for all periods.');
    }
}
