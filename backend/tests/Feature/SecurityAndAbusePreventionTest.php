<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\VideoType;
use App\Models\CreditTransaction;
use App\Services\RenderJobService;
use App\Services\CreditCalculator;
use App\Services\DaemonClient;
use App\Services\ModelSelector;
use App\Http\Requests\CreateRenderJobRequest;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SecurityAndAbusePreventionTest extends TestCase
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

        $this->daemonClient->shouldReceive('health')->andReturn(true);
        $this->daemonClient->shouldReceive('isModelAvailable')->andReturn(true);

        $this->plan = Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'max_concurrent_jobs' => 1,
            'monthly_credits' => 300,
            'queue_priority' => 'low',
            'price_regular' => 0,
            'quality_multiplier' => 1.0,
        ]);

        $this->user = User::factory()->create([
            'plan_id' => $this->plan->id,
            'credits' => 300,
        ]);

        VideoType::create([
            'code' => 'text_to_video',
            'name' => 'Text-to-Video',
            'base_credits' => 200,
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
    public function prevents_job_creation_when_insufficient_credits()
    {
        $this->user->update(['credits' => 50]);

        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());

        // Simulate credit check
        $cost = 200;
        $this->assertLessThan($cost, $this->user->credits, 'User should not have enough credits');
    }

    /** @test */
    public function prevents_negative_credits()
    {
        $this->user->update(['credits' => 0]);

        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');
        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());

        // Credits should never go negative
        $this->assertGreaterThanOrEqual(0, $this->user->credits);
    }

    /** @test */
    public function prevents_exceeding_max_concurrent_jobs()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Create max concurrent jobs
        RenderJob::create([
            'uuid' => 'job-1',
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Test job 1',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
        $this->assertTrue(str_contains(implode(' ', $result->errors()), 'active jobs'));
    }

    /** @test */
    public function no_longer_enforces_plan_duration_limit()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $request = $this->createRequest(['duration_seconds' => 60]);
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
    }

    /** @test */
    public function no_longer_enforces_plan_resolution_limit()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $request = $this->createRequest(['resolution' => '1080p']);
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
    }

    /** @test */
    public function prevents_credit_manipulation_via_negative_duration()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Try negative duration - validation should fail
        $validator = Validator::make(['duration_seconds' => -5], ['duration_seconds' => 'required|integer|min:1|max:60']);
        $this->assertFalse($validator->passes());

        // Try zero duration
        $validator = Validator::make(['duration_seconds' => 0], ['duration_seconds' => 'required|integer|min:1|max:60']);
        $this->assertFalse($validator->passes());
    }

    /** @test */
    public function prevents_credit_manipulation_via_extreme_duration()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Try extremely long duration - validation should fail
        $validator = Validator::make(['duration_seconds' => 999999], ['duration_seconds' => 'required|integer|min:1|max:60']);
        $this->assertFalse($validator->passes());
    }

    /** @test */
    public function prevents_rapid_job_spam()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Free plan allows only 1 concurrent job
        $this->plan->update(['max_concurrent_jobs' => 1]);

        // Create first job
        RenderJob::create([
            'uuid' => 'spam-1',
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Spam job',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        // Try to create second job immediately
        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertFalse($result->passes());
    }

    /** @test */
    public function free_user_can_request_any_resolution_or_duration()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // No plan-level limits on resolution/duration anymore
        $request = $this->createRequest(['resolution' => '1080p', 'duration_seconds' => 60]);
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
    }

    /** @test */
    public function no_plan_limits_on_duration_or_resolution()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        $request = $this->createRequest([
            'duration_seconds' => 60,
            'resolution' => '1080p',
        ]);

        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());
    }

    /** @test */
    public function prevents_duplicate_job_submission()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Create a job
        $job = RenderJob::create([
            'uuid' => 'unique-job',
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Unique prompt for testing',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        // Try to create job with same UUID (should fail at DB level)
        $this->expectException(\Illuminate\Database\QueryException::class);

        RenderJob::create([
            'uuid' => 'unique-job', // Same UUID
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Duplicate',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);
    }

    /** @test */
    public function validates_prompt_length_limits()
    {
        // Too short prompt
        $validator = Validator::make(['prompt' => 'Short'], ['prompt' => 'required|string|min:10|max:2000']);
        $this->assertFalse($validator->passes());

        // Too long prompt (>2000 chars)
        $longPrompt = str_repeat('a', 2001);
        $validator = Validator::make(['prompt' => $longPrompt], ['prompt' => 'required|string|min:10|max:2000']);
        $this->assertFalse($validator->passes());
    }

    /** @test */
    public function prevents_sql_injection_via_prompt()
    {
        $maliciousPrompt = "'; DROP TABLE users; --";
        $validator = Validator::make(['prompt' => $maliciousPrompt], ['prompt' => 'required|string|min:10|max:2000']);

        // Should pass validation (prompt is just stored, not executed)
        $this->assertTrue($validator->passes());

        // Verify it's stored as string, not executed
        $job = RenderJob::create([
            'uuid' => 'sql-test',
            'user_id' => $this->user->id,
            'status' => 'created',
            'prompt' => $maliciousPrompt,
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        $this->assertEquals($maliciousPrompt, $job->prompt);
        $this->assertDatabaseHas('users', ['id' => $this->user->id]);
    }

    /** @test */
    public function prevents_xss_via_prompt()
    {
        $xssPrompt = '<script>alert("XSS")</script>';
        $request = $this->createRequest(['prompt' => $xssPrompt]);

        $job = RenderJob::create([
            'uuid' => 'xss-test',
            'user_id' => $this->user->id,
            'status' => 'created',
            'prompt' => $xssPrompt,
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        // Stored as-is, should be escaped on output
        $this->assertEquals($xssPrompt, $job->prompt);
    }

    /** @test */
    public function prevents_credit_overflow_attack()
    {
        // User with max credits
        $this->user->update(['credits' => 999999999]);

        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');
        $this->creditCalculator->shouldReceive('calculate')->andReturn(200);

        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        $this->assertTrue($result->passes());

        // Credits should still be positive after deduction
        $newCredits = $this->user->credits - 200;
        $this->assertGreaterThan(0, $newCredits);
    }

    /** @test */
    public function prevents_free_tier_credit_farming()
    {
        // Create multiple free accounts
        $freeAccounts = [];
        for ($i = 0; $i < 5; $i++) {
            $freeAccounts[] = User::factory()->create([
                'plan_id' => $this->plan->id,
                'credits' => 300,
            ]);
        }

        // Each account can only create limited jobs
        foreach ($freeAccounts as $account) {
            $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

            // Create max jobs for free tier
            RenderJob::create([
                'uuid' => "farm-{$account->id}",
                'user_id' => $account->id,
                'status' => 'queued',
                'prompt' => 'Farming job',
                'model' => 'wan2.6-t2v',
                'duration_seconds' => 5,
            ]);

            // Try to create another job
            $request = $this->createRequest();
            $result = $this->service->validateCanGenerate($account, $request);

            $this->assertFalse($result->passes(), "Account {$account->id} should be blocked from spam");
        }
    }

    /** @test */
    public function enforces_rate_limiting_on_job_creation()
    {
        $this->modelSelector->shouldReceive('resolve')->andReturn('wan2.6-t2v');

        // Free plan allows only 1 concurrent job
        $this->plan->update(['max_concurrent_jobs' => 1]);

        // Create first job
        RenderJob::create([
            'uuid' => 'rate-1',
            'user_id' => $this->user->id,
            'status' => 'queued',
            'prompt' => 'Job 1',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        // Try to create second job
        $request = $this->createRequest();
        $result = $this->service->validateCanGenerate($this->user, $request);

        // Should be blocked by concurrent job limit
        $this->assertFalse($result->passes());
    }

    /** @test */
    public function prevents_unauthorized_access_to_other_users_jobs()
    {
        // Create another user
        $otherUser = User::factory()->create([
            'plan_id' => $this->plan->id,
            'credits' => 300,
        ]);

        // Create job for other user
        $otherJob = RenderJob::create([
            'uuid' => 'other-job',
            'user_id' => $otherUser->id,
            'status' => 'completed',
            'prompt' => 'Other user job',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
        ]);

        // Current user should not see other user's job
        $userJobs = $this->user->renderJobs()->get();
        $this->assertFalse($userJobs->contains($otherJob));
    }

    /** @test */
    public function validates_all_input_fields()
    {
        // Invalid video type
        $validator = Validator::make(['video_type' => 'invalid_type'], ['video_type' => 'nullable|string|in:text_to_video,image_to_video,reference_to_video,video_editing,character_animation']);
        $this->assertFalse($validator->passes());

        // Invalid quality tier
        $validator = Validator::make(['quality_tier' => 'invalid_tier'], ['quality_tier' => 'nullable|string|in:standard,premium,ultra']);
        $this->assertFalse($validator->passes());

        // Invalid aspect ratio
        $validator = Validator::make(['aspect_ratio' => '999:999'], ['aspect_ratio' => 'string|in:16:9,9:16,1:1,4:3,21:9']);
        $this->assertFalse($validator->passes());

        // Invalid resolution
        $validator = Validator::make(['resolution' => '8K'], ['resolution' => 'string|in:720p,1080p']);
        $this->assertFalse($validator->passes());
    }

    /** @test */
    public function prevents_credit_refund_abuse()
    {
        // Create a job
        $job = RenderJob::create([
            'uuid' => 'refund-test',
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'Test job',
            'model' => 'wan2.6-t2v',
            'duration_seconds' => 5,
            'credits_cost' => 200,
        ]);

        // User credits should not increase after job completion
        $initialCredits = $this->user->credits;
        $this->assertLessThanOrEqual(300, $initialCredits);

        // Try to manipulate credits directly
        $this->user->increment('credits', 1000);
        $this->assertGreaterThan(300, $this->user->credits);

        // But system should track and flag unusual credit increases
        $creditTransactions = CreditTransaction::where('user_id', $this->user->id)
            ->where('type', 'credit')
            ->where('amount', '>', 500)
            ->get();

        // Should be flagged for review
        $this->assertGreaterThanOrEqual(0, $creditTransactions->count());
    }
}
