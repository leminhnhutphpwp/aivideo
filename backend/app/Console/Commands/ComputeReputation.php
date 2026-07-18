<?php

namespace App\Console\Commands;

use App\Models\Like;
use App\Models\RenderJob;
use App\Models\User;
use App\Settings\CommunitySettings;
use Illuminate\Console\Command;

class ComputeReputation extends Command
{
    protected $signature = 'reputation:compute';

    protected $description = 'Compute reputation scores and levels for all users';

    public function handle(): void
    {
        $settings = app(CommunitySettings::class);
        $thresholds = $settings->rep_thresholds;

        $users = User::all();
        $bar = $this->output->createProgressBar($users->count());

        foreach ($users as $user) {
            $publishedCount = RenderJob::where('user_id', $user->id)
                ->whereIn('visibility', ['sharing', 'public'])
                ->count();

            $totalLikes = Like::whereIn('render_job_id', function ($q) use ($user) {
                $q->select('id')->from('render_jobs')->where('user_id', $user->id);
            })->count();

            $totalUsage = (int) RenderJob::where('user_id', $user->id)
                ->whereIn('visibility', ['sharing', 'public'])
                ->sum('usage_count');

            $accountAgeDays = max(0, (int) now()->diffInDays($user->created_at));

            $score = (int) floor(
                ($publishedCount * $settings->rep_pub_weight)
                + ($totalLikes * $settings->rep_like_weight)
                + ($totalUsage * $settings->rep_usage_weight)
                + ($accountAgeDays * $settings->rep_age_weight)
            );

            $level = 'newbie';
            arsort($thresholds);
            foreach ($thresholds as $name => $min) {
                if ($score >= (int) $min) {
                    $level = $name;
                    break;
                }
            }

            $user->update([
                'reputation_score' => $score,
                'reputation_level' => $level,
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info("Reputation computed for {$users->count()} users.");
    }
}
