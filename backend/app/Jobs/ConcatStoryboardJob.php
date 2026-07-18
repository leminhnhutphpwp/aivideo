<?php

namespace App\Jobs;

use App\Models\Storyboard;
use App\Services\AssetService;
use App\Services\DaemonClient;
use App\Services\CreditService;
use App\Events\StoryboardProgressUpdated;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ConcatStoryboardJob implements ShouldQueue
{
    use Queueable;

    public $timeout = 360;

    public function __construct(
        public Storyboard $storyboard
    ) {}

    public function handle(DaemonClient $daemonClient, CreditService $creditService, AssetService $assetService): void
    {
        if ($this->storyboard->status === 'completed') {
            return;
        }

        $scenes = $this->storyboard->scenes()
            ->where('status', 'completed')
            ->orderBy('scene_number')
            ->get();

        if ($scenes->isEmpty()) {
            $this->storyboard->markAsFailed('No completed scenes to compile');
            return;
        }

        $sceneDir = storage_path('app/storyboards/' . $this->storyboard->uuid . '/scenes');
        if (!is_dir($sceneDir)) {
            mkdir($sceneDir, 0755, true);
        }

        $scenePaths = [];
        foreach ($scenes as $scene) {
            $filename = basename($scene->output_path);
            $localPath = $sceneDir . '/' . $filename;
            $scenePaths[] = $localPath;
        }

        $listFile = $sceneDir . '/concat_list.txt';
        $outputFile = $sceneDir . '/final_' . time() . '.mp4';

        $list = '';
        foreach ($scenePaths as $path) {
            if (file_exists($path)) {
                $list .= "file '" . $path . "'\n";
            }
        }

        if (empty($list)) {
            $this->storyboard->markAsFailed('No scene files found for compilation');
            return;
        }

        file_put_contents($listFile, $list);

        $escapedOutput = escapeshellarg($outputFile);
        $escapedList = escapeshellarg($listFile);
        $cmd = "timeout 300 ffmpeg -y -f concat -safe 0 -i {$escapedList} -c copy {$escapedOutput} 2>&1";

        $output = shell_exec($cmd);
        Log::info('FFmpeg compilation output', ['storyboard_uuid' => $this->storyboard->uuid, 'output' => $output]);

        if (!file_exists($outputFile)) {
            $creditService->releaseStoryboardReserved($this->storyboard);
            $this->storyboard->markAsFailed('FFmpeg compilation failed: ' . ($output ?? 'unknown error'));
            return;
        }

        $relativePath = 'storyboards/' . $this->storyboard->uuid . '/final_' . time() . '.mp4';
        Storage::put($relativePath, file_get_contents($outputFile));

        $this->storyboard->markAsCompleted($relativePath);
        $creditService->captureStoryboardReserved($this->storyboard);

        // Create Asset record for the compiled storyboard video
        $assetService->storeFromPath(
            user: $this->storyboard->user,
            job: null,
            type: 'video',
            sourcePath: $outputFile,
            storyboard: $this->storyboard,
        );

        StoryboardProgressUpdated::dispatch($this->storyboard);

        @unlink($listFile);
        @unlink($outputFile);
        if (is_dir($sceneDir)) {
            array_map('unlink', glob($sceneDir . '/*'));
            rmdir($sceneDir);
        }

        Log::info('Storyboard compilation completed via queue', [
            'storyboard_uuid' => $this->storyboard->uuid,
            'output' => $relativePath,
        ]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error('Storyboard compilation failed', [
            'storyboard_uuid' => $this->storyboard->uuid,
            'error' => $e->getMessage(),
        ]);
        $this->storyboard->markAsFailed('Compilation failed: ' . $e->getMessage());
        try {
            app(CreditService::class)->releaseStoryboardReserved($this->storyboard);
        } catch (\Throwable $ignore) {}
        StoryboardProgressUpdated::dispatch($this->storyboard);
    }
}
