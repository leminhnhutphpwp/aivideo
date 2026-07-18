<?php
namespace Tests\Feature;

use App\Events\CreditsUpdated;
use App\Events\JobCancelled;
use App\Events\JobCompleted;
use App\Events\JobFailed;
use App\Events\JobQueued;
use App\Jobs\HandleJobCompletion;
use App\Jobs\HandleJobFailure;
use App\Models\Asset;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Models\User;
use App\Models\VideoType;
use App\Services\AssetService;
use App\Services\CreditService;
use App\Services\DaemonClient;
use App\Services\MailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RenderJobPipelineTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;
    private string $webhookSecret;

    protected function setUp(): void
    {
        parent::setUp();

        $this->webhookSecret = 'test-webhook-secret-123';
        config(['daemon.webhook_secret' => $this->webhookSecret]);
        config(['daemon.base_url' => 'http://daemon.test']);
        config(['queue.default' => 'sync']);
        config(['mail.default' => 'array']);
        config(['broadcasting.default' => 'null']);

        $this->plan = Plan::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'max_concurrent_jobs' => 5,
            'monthly_credits' => 2000,
            'price_regular' => 149000,
            'quality_multiplier' => 1.5,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->plan->id,
            'credits' => 50000,
        ]);

        foreach ([
            ['code' => 'text_to_video', 'name' => 'Text-to-Video', 'base_credits' => 200],
            ['code' => 'image_to_video', 'name' => 'Image-to-Video', 'base_credits' => 200],
            ['code' => 'reference_to_video', 'name' => 'Reference-to-Video', 'base_credits' => 250],
            ['code' => 'video_editing', 'name' => 'Video Editing', 'base_credits' => 150],
            ['code' => 'character_animation', 'name' => 'Character Animation', 'base_credits' => 300],
        ] as $vt) {
            VideoType::create($vt);
        }
    }

    protected function mockDaemonHealthy(): void
    {
        $this->mock(DaemonClient::class, function ($mock) {
            $mock->shouldReceive('health')->andReturn(true);
            $mock->shouldReceive('isModelAvailable')->andReturn(true);
            $mock->shouldReceive('createProject')->andReturn('test-project-id');
            $mock->shouldReceive('generateMedia')->andReturn('test-task-id-123');
            $mock->shouldReceive('downloadFile')->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'daemon_dl_');
                file_put_contents($path, 'fake-video-bytes');
                return $path;
            });
        });
    }

    public function test_all_five_video_types_can_be_created_via_api(): void
    {
        $this->mockDaemonHealthy();
        $this->actingAs($this->user, 'api');

        Event::fake([JobQueued::class]);

        $types = [
            'text_to_video',
            'image_to_video',
            'reference_to_video',
            'video_editing',
            'character_animation',
        ];

        foreach ($types as $videoType) {
            $response = $this->postJson('/api/render-jobs', [
                'prompt' => "Test prompt for {$videoType}",
                'video_type' => $videoType,
                'quality_tier' => 'standard',
                'duration_seconds' => 5,
                'aspect_ratio' => '16:9',
                'resolution' => '720p',
            ]);

            $response->assertStatus(201);
            $response->assertJsonPath('success', true);

            $job = RenderJob::where('uuid', $response->json('data.uuid'))->first();
            $this->assertNotNull($job);
            $this->assertEquals('queued', $job->status);
            $this->assertEquals($videoType, $job->video_type);
            $this->assertEquals('test-project-id', $job->daemon_project_id);
            $this->assertEquals('test-task-id-123', $job->daemon_task_id);

            Event::assertDispatched(JobQueued::class, fn($e) => $e->renderJob->id === $job->id);
        }
    }

    public function test_daemon_webhook_completes_job(): void
    {
        Queue::fake();

        $job = RenderJob::create([
            'uuid' => 'webhook-complete-test-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Webhook test',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'daemon_project_id' => 'project-1',
            'daemon_task_id' => 'task-1',
        ]);

        $payload = [
            'taskId' => 'task-1',
            'status' => 'completed',
            'output' => [
                'files' => ['name' => 'output.mp4', 'size' => 2048, 'gpu_seconds' => 12.5],
                'projectId' => 'project-1',
            ],
            'metadata' => ['render_job_uuid' => 'webhook-complete-test-uuid'],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => $signature,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('message', 'Webhook processed');
    }

    public function test_daemon_webhook_fails_job(): void
    {
        Queue::fake();

        $job = RenderJob::create([
            'uuid' => 'webhook-fail-test-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Fail test',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'daemon_project_id' => 'project-2',
            'daemon_task_id' => 'task-2',
        ]);

        $payload = [
            'taskId' => 'task-2',
            'status' => 'failed',
            'error_message' => 'GPU out of memory',
            'metadata' => ['render_job_uuid' => 'webhook-fail-test-uuid'],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $this->postJson('/api/daemon/webhook', $payload, ['X-Signature' => $signature])
            ->assertStatus(200);

        Queue::assertPushed(HandleJobFailure::class, fn($j) => $j->renderJob->id === $job->id);
    }

    public function test_daemon_webhook_with_invalid_signature(): void
    {
        RenderJob::create([
            'uuid' => 'bad-sig-test-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Bad sig',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'daemon_project_id' => 'project-3',
            'daemon_task_id' => 'task-3',
        ]);

        $payload = [
            'taskId' => 'task-3',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'bad-sig-test-uuid'],
        ];

        $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => 'invalid-signature',
        ])->assertStatus(401);
    }

    public function test_daemon_webhook_missing_required_fields(): void
    {
        Queue::fake();

        $payload = ['status' => 'completed'];
        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => $signature,
        ])->assertStatus(422);
    }

    public function test_daemon_webhook_ignores_already_terminal_job(): void
    {
        $job = RenderJob::create([
            'uuid' => 'terminal-test-uuid',
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'Already done',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'output_path' => '/old/output.mp4',
            'daemon_project_id' => 'project-4',
            'daemon_task_id' => 'task-4',
        ]);

        $payload = [
            'taskId' => 'task-4',
            'status' => 'completed',
            'output' => ['files' => ['name' => 'new-output.mp4']],
            'metadata' => ['render_job_uuid' => 'terminal-test-uuid'],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $this->postJson('/api/daemon/webhook', $payload, ['X-Signature' => $signature])
            ->assertJsonPath('message', 'Job already terminal, ignored');

        $job->refresh();
        $this->assertEquals('/old/output.mp4', $job->output_path);
    }

    public function test_webhook_with_interrupted_status(): void
    {
        Queue::fake();

        $job = RenderJob::create([
            'uuid' => 'interrupted-test-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Interrupted',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'daemon_project_id' => 'project-5',
            'daemon_task_id' => 'task-5',
        ]);

        $payload = [
            'taskId' => 'task-5',
            'status' => 'interrupted',
            'error_message' => 'Daemon crashed',
            'error' => ['code' => 'OOM', 'details' => 'Out of memory'],
            'metadata' => ['render_job_uuid' => 'interrupted-test-uuid'],
        ];

        $body = json_encode($payload);
        $signature = hash_hmac('sha256', $body, $this->webhookSecret);

        $this->postJson('/api/daemon/webhook', $payload, ['X-Signature' => $signature])
            ->assertStatus(200);

        Queue::assertPushed(HandleJobFailure::class, fn($j) => $j->renderJob->id === $job->id);
    }

    public function test_handle_job_completion_creates_asset(): void
    {
        $diskPath = sys_get_temp_dir() . '/opencode-test-disks/public';
        @mkdir($diskPath, 0777, true);
        config(['filesystems.disks.public' => [
            'driver' => 'local',
            'root' => $diskPath,
        ]]);
        config(['filesystems.default' => 'public']);

        $job = RenderJob::create([
            'uuid' => 'handler-complete-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Handler test',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
            'daemon_project_id' => 'project-handler',
            'daemon_task_id' => 'task-handler',
            'plan_snapshot' => $this->plan->toSnapshot(),
        ]);

        $this->user->decrement('credits', 100);

        $jobHandle = new HandleJobCompletion($job, [
            'output_path' => 'final_output.mp4',
            'gpu_seconds' => 8.3,
            'daemon_task_id' => 'task-handler',
            'daemon_project_id' => 'project-handler',
            'daemon_file' => ['name' => 'final_output.mp4', 'size' => 4096],
        ]);

        $daemonClient = $this->mock(DaemonClient::class);
        $daemonClient->shouldReceive('downloadFile')
            ->with('project-handler', 'final_output.mp4')
            ->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'dl_');
                file_put_contents($path, 'real-video-content');
                return $path;
            });

        $mailService = $this->mock(MailService::class);
        $mailService->shouldReceive('sendToUser')->byDefault();

        $jobHandle->handle(
            app(CreditService::class),
            app(AssetService::class),
            $mailService,
            $daemonClient,
        );

        $job->refresh();
        $this->assertEquals('completed', $job->status);
        $this->assertEquals('final_output.mp4', $job->output_path);
        $this->assertEqualsWithDelta(8, $job->gpu_seconds, 0.5);

        $this->assertEquals(1, $job->assets()->count());
        $asset = $job->assets()->first();
        $this->assertEquals('video', $asset->type);
        $this->assertNotNull($asset->path);
        $this->assertTrue(Storage::disk('public')->exists($asset->path));
    }

    public function test_handle_job_failure_releases_credits(): void
    {
        $initialCredits = $this->user->credits;

        $job = RenderJob::create([
            'uuid' => 'handler-fail-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Failure handler test',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 150,
        ]);

        $this->user->decrement('credits', 150);

        $jobHandle = new HandleJobFailure($job, 'Model crashed during inference');

        $creditService = $this->mock(CreditService::class, function ($mock) use ($job) {
            $mock->shouldReceive('releaseReserved')
                ->with(\Mockery::on(fn($arg) => $arg->id === $job->id))
                ->once();
        });

        $mailService = $this->mock(MailService::class);
        $mailService->shouldReceive('sendToUser')->byDefault();

        $jobHandle->handle(
            $creditService,
            $mailService,
        );

        $job->refresh();
        $this->assertEquals('failed', $job->status);
        $this->assertEquals('Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.', $job->error_message);
        $this->assertEquals('Model crashed during inference', $job->error_metadata['raw_error'] ?? null);
    }

    public function test_handle_job_failure_directly_releases_and_marks_failed(): void
    {
        $this->user->update(['credits' => 500]);
        $initialCredits = $this->user->credits;

        $job = RenderJob::create([
            'uuid' => 'handler-fail-direct-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Direct failure test',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 80,
        ]);

        app(CreditService::class)->reserve($this->user, 80, $job);

        $balanceAfterReserve = $this->user->fresh()->credits;
        $this->assertEquals($initialCredits - 80, $balanceAfterReserve);

        $mailService = $this->mock(MailService::class);
        $mailService->shouldReceive('sendToUser')->byDefault();

        $jobHandle = new HandleJobFailure($job, 'API timeout after 30s');
        $jobHandle->handle(
            app(CreditService::class),
            $mailService,
        );

        $job->refresh();
        $this->assertEquals('failed', $job->status);
        $this->assertEquals('Hệ thống AI tạm thời không khả dụng. Vui lòng thử lại sau.', $job->error_message);
        $this->assertEquals('API timeout after 30s', $job->error_metadata['raw_error'] ?? null);

        $this->assertEquals($initialCredits, $this->user->fresh()->credits);
    }

    public function test_job_lifecycle_with_daemon_submission(): void
    {
        $this->mockDaemonHealthy();
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'A cinematic landscape shot',
            'video_type' => 'text_to_video',
            'quality_tier' => 'premium',
            'duration_seconds' => 10,
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
        ]);

        $response->assertStatus(201);
        $job = RenderJob::where('uuid', $response->json('data.uuid'))->first();

        $this->assertEquals('queued', $job->status);
        $this->assertEquals('text_to_video', $job->video_type);
        $this->assertEquals('premium', $job->quality_tier);
        $this->assertEquals(10, $job->duration_seconds);
        $this->assertEquals('1080p', $job->resolution);
        $this->assertNotNull($job->daemon_project_id);
        $this->assertNotNull($job->daemon_task_id);
        $this->assertNotNull($job->queued_at);
        $this->assertNotNull($job->plan_snapshot);
        $this->assertEquals($this->plan->slug, $job->plan_snapshot['slug']);

        $job->markAsProcessing();
        $this->assertEquals('processing', $job->status);
        $this->assertNotNull($job->started_at);

        $job->markAsCompleted('/output/final.mp4');
        $this->assertEquals('completed', $job->status);
        $this->assertEquals('/output/final.mp4', $job->output_path);
        $this->assertTrue($job->isTerminal());
    }

    public function test_cancel_job_releases_credits_and_broadcasts(): void
    {
        $mailService = $this->mock(MailService::class);
        $mailService->shouldReceive('sendToUser')->byDefault();

        $this->mockDaemonHealthy();
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/render-jobs', [
            'prompt' => 'A job to cancel',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $job = RenderJob::where('uuid', $response->json('data.uuid'))->first();

        $cancelResponse = $this->postJson("/api/render-jobs/{$job->uuid}/cancel");
        $cancelResponse->assertStatus(200);

        $job->refresh();
        $this->assertEquals('cancelled', $job->status);
        $this->assertTrue($job->isTerminal());
    }

    public function test_storyboard_scene_full_lifecycle_with_output(): void
    {
        $storyboard = Storyboard::create([
            'uuid' => 'scene-lifecycle-test',
            'user_id' => $this->user->id,
            'title' => 'Lifecycle test',
            'status' => 'draft',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Opening scene',
            'status' => 'pending',
            'duration_seconds' => 5,
        ]);

        $this->assertEquals('pending', $scene->status);
        $this->assertFalse($scene->isTerminal());

        $scene->markAsQueued();
        $this->assertEquals('queued', $scene->status);

        $scene->markAsRendering();
        $this->assertEquals('rendering', $scene->status);

        $scene->markAsCompleted('/scenes/opening.mp4', '/thumb/opening.jpg');
        $this->assertEquals('completed', $scene->status);
        $this->assertEquals('/scenes/opening.mp4', $scene->output_path);
        $this->assertEquals('/thumb/opening.jpg', $scene->thumbnail_path);
        $this->assertTrue($scene->isTerminal());
    }

    public function test_storyboard_scene_failure(): void
    {
        $storyboard = Storyboard::create([
            'uuid' => 'scene-fail-test',
            'user_id' => $this->user->id,
            'title' => 'Fail scene',
            'status' => 'draft',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Failing scene',
            'status' => 'rendering',
            'duration_seconds' => 5,
        ]);

        $scene->markAsFailed('Scene rendering failed: style incompatible with prompt');
        $this->assertEquals('failed', $scene->status);
        $this->assertEquals('Scene rendering failed: style incompatible with prompt', $scene->error_message);
        $this->assertTrue($scene->isTerminal());
    }
}
