<?php

namespace Tests\Feature;

use App\Jobs\ConcatStoryboardJob;
use App\Models\Asset;
use App\Models\DurationTier;
use App\Models\Plan;
use App\Models\ResolutionPricing;
use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Models\User;
use App\Models\VideoType;
use App\Services\AssetService;
use App\Services\CreditService;
use App\Services\DaemonClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ConcatStoryboardJobTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Storyboard $storyboard;

    protected function setUp(): void
    {
        parent::setUp();

        config(['filesystems.default' => 'public']);
        config(['queue.default' => 'sync']);
        config(['broadcasting.default' => 'null']);
        config(['daemon.base_url' => 'http://daemon.test']);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free Plan',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'quality_multiplier' => 1.0,
        ]);

        VideoType::create([
            'code' => 'storyboard_video',
            'name' => 'Storyboard Video',
            'base_credits' => 250,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        DurationTier::create([
            'code' => '5s',
            'name' => '5 Seconds',
            'seconds' => 5,
            'multiplier' => 1.0,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        ResolutionPricing::create([
            'code' => '720p',
            'name' => 'HD 720p',
            'width' => 1280,
            'height' => 720,
            'multiplier' => 1.0,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $this->user = User::factory()->create([
            'credits' => 50000,
            'plan_id' => Plan::first()->id,
        ]);

        $this->storyboard = Storyboard::create([
            'uuid' => 'concat-test-sb-uuid',
            'user_id' => $this->user->id,
            'title' => 'Concat Test Storyboard',
            'status' => 'rendering',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'render_mode' => 'multi_scene',
            'credits_cost' => 250,
        ]);
    }

    protected function createCompletedScene(int $number, string $outputFilename): StoryboardScene
    {
        $sceneDir = storage_path('app/storyboards/' . $this->storyboard->uuid . '/scenes');
        if (!is_dir($sceneDir)) {
            mkdir($sceneDir, 0755, true);
        }

        $filePath = $sceneDir . '/' . $outputFilename;
        file_put_contents($filePath, 'fake-scene-' . $number . '-content');

        return StoryboardScene::create([
            'storyboard_id' => $this->storyboard->id,
            'scene_number' => $number,
            'prompt' => 'Scene ' . $number,
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'completed',
            'output_path' => 'storyboards/' . $this->storyboard->uuid . '/scenes/' . $outputFilename,
        ]);
    }

    public function test_concat_job_fails_when_ffmpeg_cannot_process_files(): void
    {
        $this->createCompletedScene(1, 'scene_001.mp4');
        $this->createCompletedScene(2, 'scene_002.mp4');

        $daemonClient = $this->mock(DaemonClient::class);
        $creditService = $this->mock(CreditService::class);
        $assetService = $this->mock(AssetService::class);

        $creditService->shouldNotReceive('captureStoryboardReserved');
        $creditService->shouldReceive('releaseStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));
        $assetService->shouldNotReceive('storeFromPath');

        $job = new ConcatStoryboardJob($this->storyboard);
        $job->handle($daemonClient, $creditService, $assetService);

        $this->storyboard->refresh();
        $this->assertEquals('failed', $this->storyboard->status);
        // FFmpeg fails because scene files contain fake data, not valid video
        $this->assertStringContainsString('FFmpeg compilation failed', $this->storyboard->error_message);
    }

    public function test_concat_job_releases_credits_on_ffmpeg_failure(): void
    {
        $this->createCompletedScene(1, 'scene_001.mp4');
        $this->createCompletedScene(2, 'scene_002.mp4');

        $daemonClient = $this->mock(DaemonClient::class);
        $creditService = $this->mock(CreditService::class);
        $assetService = $this->mock(AssetService::class);

        $creditService->shouldReceive('releaseStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));

        $job = new ConcatStoryboardJob($this->storyboard);
        $job->handle($daemonClient, $creditService, $assetService);
    }

    public function test_concat_job_skips_when_already_completed(): void
    {
        $this->storyboard->markAsCompleted('/existing/output.mp4');

        $daemonClient = $this->mock(DaemonClient::class);
        $creditService = $this->mock(CreditService::class);
        $assetService = $this->mock(AssetService::class);

        $daemonClient->shouldNotReceive('downloadFile');
        $creditService->shouldNotReceive('captureStoryboardReserved');
        $assetService->shouldNotReceive('storeFromPath');

        $job = new ConcatStoryboardJob($this->storyboard);
        $job->handle($daemonClient, $creditService, $assetService);
    }

    public function test_concat_job_fails_when_no_completed_scenes(): void
    {
        $daemonClient = $this->mock(DaemonClient::class);
        $creditService = $this->mock(CreditService::class);
        $assetService = $this->mock(AssetService::class);

        $creditService->shouldNotReceive('captureStoryboardReserved');
        $assetService->shouldNotReceive('storeFromPath');

        $job = new ConcatStoryboardJob($this->storyboard);
        $job->handle($daemonClient, $creditService, $assetService);

        $this->storyboard->refresh();
        $this->assertEquals('failed', $this->storyboard->status);
        $this->assertEquals('No completed scenes to compile', $this->storyboard->error_message);
    }
}
