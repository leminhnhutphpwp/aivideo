<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\CreditTransaction;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Subscription;
use App\Models\User;
use App\Services\DaemonClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class MetricsController extends Controller
{
    public function __construct(
        protected DaemonClient $daemonClient
    ) {}

    public function prometheus(Request $request): \Illuminate\Http\Response
    {
        $format = $request->query('format', 'prometheus');
        if ($format !== 'prometheus') {
            return $this->json();
        }

        $lines = [];
        $lines = array_merge($lines, $this->getHorizonMetricsLines());

        $lines[] = '# HELP laravel_up Laravel application is up';
        $lines[] = '# TYPE laravel_up gauge';
        $lines[] = 'laravel_up 1';

        $usersTotal = User::count();
        $lines[] = '# HELP laravel_users_total Total registered users';
        $lines[] = '# TYPE laravel_users_total gauge';
        $lines[] = "laravel_users_total $usersTotal";

        $verifiedUsers = User::whereNotNull('email_verified_at')->count();
        $lines[] = '# HELP laravel_users_verified_total Users with verified email';
        $lines[] = '# TYPE laravel_users_verified_total gauge';
        $lines[] = "laravel_users_verified_total $verifiedUsers";

        $plans = Plan::pluck('slug', 'id');
        $lines[] = '# HELP laravel_subscriptions_active_total Active subscriptions by plan';
        $lines[] = '# TYPE laravel_subscriptions_active_total gauge';
        try {
            $subscriptionsByPlan = Subscription::select('plan_id', DB::raw('COUNT(*) as count'))
                ->where('status', 'active')
                ->groupBy('plan_id')
                ->pluck('count', 'plan_id');
            foreach ($plans as $id => $slug) {
                $count = $subscriptionsByPlan->get($id, 0);
                $lines[] = "laravel_subscriptions_active_total{plan=\"$slug\"} $count";
            }
        } catch (\Throwable) {
            foreach ($plans as $id => $slug) {
                $lines[] = "laravel_subscriptions_active_total{plan=\"$slug\"} 0";
            }
        }

        $jobsByStatus = RenderJob::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');
        $lines[] = '# HELP laravel_render_jobs_total Render jobs by status';
        $lines[] = '# TYPE laravel_render_jobs_total gauge';
        foreach (['pending', 'processing', 'completed', 'failed', 'cancelled'] as $status) {
            $count = $jobsByStatus->get($status, 0);
            $lines[] = "laravel_render_jobs_total{status=\"$status\"} $count";
        }

        $todayCredits = CreditTransaction::whereDate('created_at', today())
            ->where('type', 'reservation')
            ->sum('amount');
        $lines[] = '# HELP laravel_credits_reserved_today Credits reserved today';
        $lines[] = '# TYPE laravel_credits_reserved_today gauge';
        $lines[] = "laravel_credits_reserved_today $todayCredits";

        $totalCreditsSpent = CreditTransaction::where('type', 'reservation')->sum('amount');
        $lines[] = '# HELP laravel_credits_spent_total Total credits spent';
        $lines[] = '# TYPE laravel_credits_spent_total gauge';
        $lines[] = "laravel_credits_spent_total $totalCreditsSpent";

        $totalCreditsPurchased = CreditTransaction::where('type', 'purchase')->sum('amount');
        $lines[] = '# HELP laravel_credits_purchased_total Total credits purchased';
        $lines[] = '# TYPE laravel_credits_purchased_total gauge';
        $lines[] = "laravel_credits_purchased_total $totalCreditsPurchased";

        $dbOk = 0;
        try {
            DB::connection()->getPdo();
            $dbOk = 1;
        } catch (\Throwable) {}
        $lines[] = '# HELP laravel_database_up Database connection status';
        $lines[] = '# TYPE laravel_database_up gauge';
        $lines[] = "laravel_database_up $dbOk";

        $redisOk = 0;
        try {
            Cache::store('redis')->set('metrics:ping', true, 10);
            $redisOk = Cache::store('redis')->get('metrics:ping') === true ? 1 : 0;
        } catch (\Throwable) {}
        $lines[] = '# HELP laravel_redis_up Redis connection status';
        $lines[] = '# TYPE laravel_redis_up gauge';
        $lines[] = "laravel_redis_up $redisOk";

        $daemonOk = $this->daemonClient->health() ? 1 : 0;
        $lines[] = '# HELP laravel_daemon_up Daemon reachable from Laravel';
        $lines[] = '# TYPE laravel_daemon_up gauge';
        $lines[] = "laravel_daemon_up $daemonOk";

        $queueSize = 0;
        try {
            $queueSize = Cache::store('redis')->llen('queues:default');
        } catch (\Throwable) {}
        $lines[] = '# HELP laravel_queue_depth Default queue depth';
        $lines[] = '# TYPE laravel_queue_depth gauge';
        $lines[] = "laravel_queue_depth $queueSize";

        return response(implode("\n", $lines) . "\n", 200, [
            'Content-Type' => 'text/plain; charset=utf-8',
        ]);
    }

    public function json(): JsonResponse
    {
        $usersTotal = User::count();
        $verifiedUsers = User::whereNotNull('email_verified_at')->count();

        $plans = Plan::pluck('slug', 'id');
        $subscriptionsByPlan = Subscription::select('plan_id', DB::raw('COUNT(*) as count'))
            ->where('status', 'active')
            ->groupBy('plan_id')
            ->pluck('count', 'plan_id');

        $jobsByStatus = RenderJob::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $dbOk = false;
        try { DB::connection()->getPdo(); $dbOk = true; } catch (\Throwable) {}

        $redisOk = false;
        try {
            Cache::store('redis')->set('metrics:ping', true, 10);
            $redisOk = Cache::store('redis')->get('metrics:ping') === true;
        } catch (\Throwable) {}

        return response()->json([
            'users' => [
                'total' => $usersTotal,
                'verified' => $verifiedUsers,
            ],
            'subscriptions' => $plans->mapWithKeys(fn ($slug, $id) => [$slug => $subscriptionsByPlan->get($id, 0)]),
            'render_jobs' => collect(['pending', 'processing', 'completed', 'failed', 'cancelled'])
                ->mapWithKeys(fn ($s) => [$s => $jobsByStatus->get($s, 0)]),
            'credits' => [
                'reserved_today' => CreditTransaction::whereDate('created_at', today())->where('type', 'reservation')->sum('amount'),
                'spent_total' => CreditTransaction::where('type', 'reservation')->sum('amount'),
                'purchased_total' => CreditTransaction::where('type', 'purchase')->sum('amount'),
            ],
            'health' => [
                'database' => $dbOk,
                'redis' => $redisOk,
                'daemon' => $this->daemonClient->health(),
            ],
            'timestamp' => now()->toISOString(),
        ]);
    }

    protected function getHorizonMetricsLines(): array
    {
        $lines = [];

        try {
            $metrics = app(\Laravel\Horizon\Contracts\MetricsRepository::class);
            $jobs = app(\Laravel\Horizon\Contracts\JobRepository::class);

            // Measured jobs throughput
            $measuredJobs = $metrics->measuredJobs();
            $lines[] = '# HELP laravel_horizon_measured_jobs_total Horizon measured jobs';
            $lines[] = '# TYPE laravel_horizon_measured_jobs_total gauge';
            $lines[] = 'laravel_horizon_measured_jobs_total ' . count($measuredJobs);

            // Per-job throughput + runtime (last snapshot)
            $lines[] = '# HELP laravel_horizon_job_throughput Job throughput per minute';
            $lines[] = '# TYPE laravel_horizon_job_throughput gauge';
            $lines[] = '# HELP laravel_horizon_job_runtime_seconds Average job runtime in seconds';
            $lines[] = '# TYPE laravel_horizon_job_runtime_seconds gauge';
            foreach ($measuredJobs as $jobClass) {
                $snapshots = $metrics->snapshotsForJob($jobClass);
                $latest = !empty($snapshots) ? end($snapshots) : null;
                if ($latest) {
                    $slug = str_replace('\\', '_', $jobClass);
                    $slug = str_replace('"', '\"', $slug);
                    $lines[] = "laravel_horizon_job_throughput{job=\"$slug\"} " . ((int) ($latest->throughput ?? 0));
                    $lines[] = "laravel_horizon_job_runtime_seconds{job=\"$slug\"} " . round(($latest->runtime ?? 0) / 1000, 3);
                }
            }

            // Failed jobs count
            $recentlyFailed = $jobs->countRecentlyFailed();
            $lines[] = '# HELP laravel_horizon_failed_jobs_total Recently failed jobs count';
            $lines[] = '# TYPE laravel_horizon_failed_jobs_total gauge';
            $lines[] = "laravel_horizon_failed_jobs_total $recentlyFailed";

            // Queue sizes from Redis
            $queues = ['default', 'media', 'webhooks', 'notifications', 'emails'];
            $lines[] = '# HELP laravel_queue_depth_by_name Queue depth by queue name';
            $lines[] = '# TYPE laravel_queue_depth_by_name gauge';
            foreach ($queues as $queue) {
                $depth = 0;
                try {
                    $depth = Cache::store('redis')->llen('queues:' . $queue);
                } catch (\Throwable) {}
                $lines[] = "laravel_queue_depth_by_name{queue=\"$queue\"} $depth";
            }

            // Horizon status
            $masterStatus = Cache::store('redis')->get('illuminate:queue:restart') ? 'paused' : 'running';
            $lines[] = '# HELP laravel_horizon_master_status Horizon master status (1=running, 0=paused)';
            $lines[] = '# TYPE laravel_horizon_master_status gauge';
            $lines[] = 'laravel_horizon_master_status ' . ($masterStatus === 'running' ? 1 : 0);

            // Worker process count (via Redis status)
            $workCount = 0;
            try {
                $workCount = Cache::store('redis')->scard('illuminate:queue:workers');
            } catch (\Throwable) {}
            $lines[] = '# HELP laravel_horizon_workers_total Active worker process count';
            $lines[] = '# TYPE laravel_horizon_workers_total gauge';
            $lines[] = "laravel_horizon_workers_total $workCount";
        } catch (\Throwable $e) {
            // Redis or Horizon not available — skip Horizon metrics
            $lines[] = '# laravel_horizon_unavailable Horizon metrics unavailable: ' . str_replace(["\n", "\r"], ' ', $e->getMessage());
        }

        return $lines;
    }
}
