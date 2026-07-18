<?php

namespace Tests\Unit\Services;

use App\Models\Asset;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\User;
use App\Services\AssetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssetServiceTest extends TestCase
{
    use RefreshDatabase;

    private AssetService $assetService;
    private User $user;
    private RenderJob $job;
    private Storyboard $storyboard;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        config(['filesystems.default' => 'public']);
        config(['assets.ai_generated_expire_days' => 365]);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free Plan',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);

        $this->assetService = new AssetService();
        $this->user = User::factory()->create(['plan_id' => Plan::first()->id]);

        $this->job = RenderJob::create([
            'uuid' => 'asset-svc-job-uuid',
            'user_id' => $this->user->id,
            'status' => 'processing',
            'prompt' => 'Test job for asset service',
            'model' => 'wan2.6-t2v',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 100,
        ]);

        $this->storyboard = Storyboard::create([
            'uuid' => 'asset-svc-sb-uuid',
            'user_id' => $this->user->id,
            'title' => 'Asset Service Storyboard',
            'status' => 'rendering',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'render_mode' => 'single_flow',
        ]);
    }

    protected function createTempFile(string $content = 'fake-video-content', string $ext = 'mp4'): string
    {
        $path = tempnam(sys_get_temp_dir(), 'asset_test_') . '.' . $ext;
        file_put_contents($path, $content);
        $this->assertFileExists($path);
        return $path;
    }

    public function test_store_from_path_without_storyboard_returns_job_asset(): void
    {
        $sourcePath = $this->createTempFile('job-video-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: $this->job,
            type: 'video',
            sourcePath: $sourcePath,
            storyboard: null,
        );

        $this->assertNotNull($asset);
        $this->assertInstanceOf(Asset::class, $asset);
        $this->assertEquals($this->user->id, $asset->user_id);
        $this->assertEquals($this->job->id, $asset->render_job_id);
        $this->assertNull($asset->storyboard_id);
        $this->assertEquals('video', $asset->type);
        $this->assertStringStartsWith('videos/', $asset->path);
        // MIME type matches the actual file content (text/plain for temp files)
        $this->assertIsString($asset->mime_type);
        $this->assertNotEmpty($asset->mime_type);
        $this->assertGreaterThan(0, $asset->size_bytes);
        $this->assertNotNull($asset->expires_at);

        Storage::disk('public')->assertExists($asset->path);

        @unlink($sourcePath);
    }

    public function test_store_from_path_with_storyboard_sets_storyboard_id(): void
    {
        $sourcePath = $this->createTempFile('storyboard-video-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: null,
            type: 'video',
            sourcePath: $sourcePath,
            storyboard: $this->storyboard,
        );

        $this->assertNotNull($asset);
        $this->assertInstanceOf(Asset::class, $asset);
        $this->assertEquals($this->user->id, $asset->user_id);
        $this->assertNull($asset->render_job_id);
        $this->assertEquals($this->storyboard->id, $asset->storyboard_id);
        $this->assertEquals('video', $asset->type);
        $this->assertStringStartsWith('videos/', $asset->path);
        $this->assertIsString($asset->mime_type);
        $this->assertNotEmpty($asset->mime_type);

        Storage::disk('public')->assertExists($asset->path);

        @unlink($sourcePath);
    }

    public function test_store_from_path_with_storyboard_render_job_is_null(): void
    {
        $sourcePath = $this->createTempFile('storyboard-only-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: null,
            type: 'video',
            sourcePath: $sourcePath,
            storyboard: $this->storyboard,
        );

        $this->assertNull($asset->render_job_id);
        $this->assertEquals($this->storyboard->id, $asset->storyboard_id);
    }

    public function test_store_from_path_with_image_type_creates_image_asset(): void
    {
        $sourcePath = $this->createTempFile('image-data', 'png');
        // Write a proper PNG header so mime_content_type detects it as image/png
        file_put_contents($sourcePath, "\x89PNG\r\n\x1a\n" . 'fake-png-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: $this->job,
            type: 'image',
            sourcePath: $sourcePath,
        );

        $this->assertNotNull($asset);
        $this->assertEquals('image', $asset->type);
        $this->assertStringStartsWith('images/', $asset->path);
        $this->assertIsString($asset->mime_type);
        $this->assertNotEmpty($asset->mime_type);
        $this->assertEquals($this->job->id, $asset->render_job_id);
        $this->assertNull($asset->storyboard_id);

        @unlink($sourcePath);
    }

    public function test_store_from_path_persists_to_database(): void
    {
        $sourcePath = $this->createTempFile('persist-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: $this->job,
            type: 'video',
            sourcePath: $sourcePath,
        );

        $this->assertDatabaseHas('assets', [
            'id' => $asset->id,
            'uuid' => $asset->uuid,
            'user_id' => $this->user->id,
            'render_job_id' => $this->job->id,
            'type' => 'video',
        ]);

        @unlink($sourcePath);
    }

    public function test_store_from_path_with_storyboard_persists_to_database(): void
    {
        $sourcePath = $this->createTempFile('sb-persist-data');

        $asset = $this->assetService->storeFromPath(
            user: $this->user,
            job: null,
            type: 'video',
            sourcePath: $sourcePath,
            storyboard: $this->storyboard,
        );

        $this->assertDatabaseHas('assets', [
            'id' => $asset->id,
            'uuid' => $asset->uuid,
            'user_id' => $this->user->id,
            'storyboard_id' => $this->storyboard->id,
            'render_job_id' => null,
            'type' => 'video',
        ]);

        @unlink($sourcePath);
    }

    public function test_store_upload_still_works_without_job_or_storyboard(): void
    {
        $file = UploadedFile::fake()->create('uploaded_video.mp4', 512, 'video/mp4');

        $asset = $this->assetService->storeUpload(
            user: $this->user,
            file: $file,
        );

        $this->assertNotNull($asset);
        $this->assertEquals($this->user->id, $asset->user_id);
        $this->assertNull($asset->render_job_id);
        $this->assertNull($asset->storyboard_id);
        $this->assertEquals('video', $asset->type);
        $this->assertStringStartsWith('videos/', $asset->path);

        Storage::disk('public')->assertExists($asset->path);
    }
}
