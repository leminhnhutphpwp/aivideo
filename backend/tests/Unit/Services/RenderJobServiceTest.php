<?php

namespace Tests\Unit\Services;

use App\Services\RenderJobService;
use App\Services\CreditCalculator;
use App\Services\DaemonClient;
use App\Services\ModelSelector;
use App\Models\User;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Http\Requests\CreateRenderJobRequest;
use App\Exceptions\ValidationResult;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;

class RenderJobServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RenderJobService $service;
    protected $creditCalculator;
    protected $daemonClient;
    protected $modelSelector;
    protected User $user;
    protected Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        $this->creditCalculator = $this->mock(CreditCalculator::class);
        $this->daemonClient = $this->mock(DaemonClient::class);
        $this->modelSelector = $this->mock(ModelSelector::class);

        $this->service = new RenderJobService(
            $this->creditCalculator,
            $this->daemonClient,
            $this->modelSelector,
        );

        $this->plan = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'max_concurrent_jobs' => 2,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->plan->id,
        ]);
    }

    protected function createRequest(array $overrides = []): CreateRenderJobRequest
    {
        $data = array_merge([
            'prompt' => 'A beautiful sunset over the ocean',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'parameters' => [],
            'reference_images' => [],
        ], $overrides);

        return CreateRenderJobRequest::create('/api/render-jobs', 'POST', $data);
    }

    /** @test */
    public function validates_successful_job_creation_with_standard_quality()
    {
        $this->daemonClient->shouldReceive('health')->andReturn(true);
        $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(true);
        $this->modelSelector->shouldReceive('resolve')
            ->with(\Mockery::type(Plan::class), 'text_to_video')
            ->andReturn('wan2.6-t2v');

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
        $this->assertEmpty($result->errors());
    }

    /** @test */
    public function validates_successful_job_creation_with_premium_quality()
    {
        $this->plan->update(['quality_multiplier' => 1.50]);

        $this->daemonClient->shouldReceive('health')->andReturn(true);
        $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(true);
        $this->modelSelector->shouldReceive('resolve')
            ->with(\Mockery::type(Plan::class), 'image_to_video')
            ->andReturn('kling-3.0-std');

        $request = $this->createRequest([
            'video_type' => 'image_to_video',
            'quality_tier' => 'premium',
        ]);

        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
    }

    /** @test */
    public function fails_validation_when_daemon_is_down()
    {
        $this->daemonClient->shouldReceive('health')->andReturn(false);
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
        $this->assertTrue(str_contains(implode(' ', $result->errors()), 'bảo trì'));
    }

    /** @test */
    public function fails_validation_when_model_not_available()
    {
        $this->daemonClient->shouldReceive('health')->andReturn(true);
        $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(false);
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
        $this->assertTrue(str_contains(implode(' ', $result->errors()), 'không khả dụng'));
    }

    /** @test */
    public function fails_validation_when_max_concurrent_jobs_reached()
    {
        $this->daemonClient->shouldReceive('health')->andReturn(true);
        $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(true);
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $this->plan->update(['max_concurrent_jobs' => 1]);

        RenderJob::create([
            'uuid' => 'test-uuid-1',
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Test job',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
        $this->assertTrue(str_contains(implode(' ', $result->errors()), 'active jobs'));
    }

    /** @test */
    public function creates_job_with_correct_model_from_quality_tier()
    {
        $this->plan->update(['quality_multiplier' => 1.50]);

        $this->modelSelector->shouldReceive('resolve')
            ->with(\Mockery::type(Plan::class), 'image_to_video')
            ->andReturn('kling-3.0-std');

        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest([
            'video_type' => 'image_to_video',
            'quality_tier' => 'premium',
        ]);

        $job = $this->service->createJob($this->user, $request, 200);

        $this->assertEquals('kling-3.0-std', $job->model);
        $this->assertEquals('premium', $job->quality_tier);
        $this->assertEquals('image_to_video', $job->video_type);
        $this->assertEquals(200, $job->credits_cost);
    }

    /** @test */
    public function creates_job_with_default_quality_tier_when_not_provided()
    {
        $this->modelSelector->shouldReceive('resolve')
            ->with(\Mockery::type(Plan::class), 'text_to_video')
            ->andReturn('wan2.6-t2v');

        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest(['quality_tier' => null]);

        $job = $this->service->createJob($this->user, $request, 200);

        $this->assertEquals('wan2.6-t2v', $job->model);
        $this->assertEquals('standard', $job->quality_tier);
    }

    /** @test */
    public function creates_job_with_default_video_type_when_not_provided()
    {
        $this->modelSelector->shouldReceive('resolve')
            ->with(\Mockery::type(Plan::class), 'text_to_video')
            ->andReturn('wan2.6-t2v');

        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest(['video_type' => null]);

        $job = $this->service->createJob($this->user, $request, 200);

        $this->assertEquals('wan2.6-t2v', $job->model);
        $this->assertEquals('text_to_video', $job->video_type);
    }

    /** @test */
    public function resolves_model_for_all_video_types()
    {
        $videoTypes = [
            'text_to_video' => 'wan2.6-t2v',
            'image_to_video' => 'wan2.6-i2v',
            'reference_to_video' => 'wan2.7-r2v',
            'video_editing' => 'wan2.7-videoedit',
            'character_animation' => 'wan2.2-animate-move',
        ];

        foreach ($videoTypes as $type => $expectedModel) {
            $this->modelSelector->shouldReceive('resolve')
                ->with(\Mockery::type(Plan::class), $type)
                ->andReturn($expectedModel);

            $this->daemonClient->shouldReceive('health')->andReturn(true);
            $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(true);

            $request = $this->createRequest(['video_type' => $type]);
            $result = $this->service->validateCanGenerate($this->user, $request);

            $this->assertTrue($result->passes(), "Failed for video type: {$type}");
        }
    }

    /** @test */
    public function handles_multiple_validation_errors()
    {
        $this->daemonClient->shouldReceive('health')->andReturn(false);
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $this->plan->update([
            'max_concurrent_jobs' => 0,
        ]);

        $request = $this->createRequest(['duration_seconds' => 30]);
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
        $this->assertGreaterThanOrEqual(2, count($result->errors()));
    }
}
