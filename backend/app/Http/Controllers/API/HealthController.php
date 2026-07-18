<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\RenderJob;
use App\Services\DaemonClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class HealthController extends Controller
{
    public function __construct(
        protected DaemonClient $daemonClient
    ) {}

    public function index(): JsonResponse
    {
        $dbOk = false;
        $dbName = '';
        try {
            $pdo = DB::connection()->getPdo();
            $dbOk = true;
            $dbName = $pdo->query('SELECT DATABASE()')->fetchColumn() ?: 'sqlite';
        } catch (\Throwable) {}

        $redisOk = false;
        try {
            Cache::store('redis')->set('health:ping', true, 10);
            $redisOk = Cache::store('redis')->get('health:ping') === true;
        } catch (\Throwable) {}

        $queueSize = 0;
        try {
            $queueSize = Cache::store('redis')->llen('queues:default');
        } catch (\Throwable) {}

        $daemonOk = $this->daemonClient->health();

        $activeJobs = RenderJob::whereIn('status', ['pending', 'processing'])->count();
        $failedJobs = RenderJob::where('status', 'failed')->count();

        $phpVersion = PHP_VERSION;
        $laravelVersion = app()->version();

        return response()->json([
            'status' => $dbOk && $redisOk && $daemonOk ? 'healthy' : 'degraded',
            'timestamp' => now()->toISOString(),
            'version' => $laravelVersion,
            'checks' => [
                'database' => [
                    'ok' => $dbOk,
                    'driver' => $dbName,
                ],
                'redis' => $redisOk,
                'queue' => [
                    'ok' => $redisOk,
                    'depth' => $queueSize,
                ],
                'daemon' => $daemonOk,
            ],
            'metrics' => [
                'active_jobs' => $activeJobs,
                'failed_jobs' => $failedJobs,
                'queue_depth' => $queueSize,
            ],
            'system' => [
                'php' => $phpVersion,
                'laravel' => $laravelVersion,
            ],
        ]);
    }
}
