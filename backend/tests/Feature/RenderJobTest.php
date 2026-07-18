<?php
namespace Tests\Feature;

use App\Models\DurationTier;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\ResolutionPricing;
use App\Models\User;
use App\Models\VideoType;
use App\Services\CreditCalculator;
use App\Services\RenderJobService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RenderJobTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['credits' => 100]);

        // Seed pricing data so PricingCalculator path is used (not fallback)
        $this->seedPricingData();
    }

    protected function seedPricingData(): void
    {
        VideoType::create([
            'code' => 'text_to_video',
            'name' => 'Text-to-Video',
            'base_credits' => 200,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $durations = [
            ['code' => '5s',  'name' => '5 seconds',  'seconds' => 5,  'multiplier' => 0.78],
            ['code' => '10s', 'name' => '10 seconds', 'seconds' => 10, 'multiplier' => 1.75],
            ['code' => '15s', 'name' => '15 seconds', 'seconds' => 15, 'multiplier' => 3.00],
            ['code' => '20s', 'name' => '20 seconds', 'seconds' => 20, 'multiplier' => 4.67],
            ['code' => '30s', 'name' => '30 seconds', 'seconds' => 30, 'multiplier' => 8.40],
        ];
        foreach ($durations as $d) {
            DurationTier::create(array_merge($d, ['is_active' => true, 'sort_order' => $d['seconds']]));
        }

        ResolutionPricing::create([
            'code' => '720p', 'name' => 'HD 720p', 'width' => 1280, 'height' => 720,
            'multiplier' => 1.0, 'is_active' => true, 'sort_order' => 720,
        ]);
        ResolutionPricing::create([
            'code' => '1080p', 'name' => 'Full HD 1080p', 'width' => 1920, 'height' => 1080,
            'multiplier' => 1.5, 'is_active' => true, 'sort_order' => 1080,
        ]);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
        ]);
        
        $this->user->update(['plan_id' => Plan::where('slug', 'free')->first()->id]);
    }

    /**
     * Credit calculation now delegates to PricingCalculator (DB-based).
     * 
     * Formula: base_credits * duration_multiplier * resolution_multiplier * quality_multiplier
     *   = 200 * dM * rM * 1.0
     */
    public function test_credit_calculation(): void
    {
        $calculator = new CreditCalculator();

        // 5s → 5s tier (0.78x): 200 * 0.78 * 1.0 * 1.0 = 156
        $this->assertEquals(156, $calculator->calculate(5, '720p'));

        // 5s → 5s tier (0.78x), 1080p (1.5x): 200 * 0.78 * 1.5 * 1.0 = 234
        $this->assertEquals(234, $calculator->calculate(5, '1080p'));

        // 1s → maps to 5s tier (0.78x): 200 * 0.78 * 1.0 * 1.0 = 156
        $this->assertEquals(156, $calculator->calculate(1, '720p'));

        // 25s → maps to 30s tier (8.40x): 200 * 8.40 * 1.0 * 1.0 = 1680
        $this->assertEquals(1680, $calculator->calculate(25, '720p'));
    }

    /** @test */
    public function credit_calculation_falls_back_to_config_when_db_not_seeded(): void
    {
        // Wipe pricing tables so PricingCalculator fails → fallback to config
        VideoType::query()->delete();
        DurationTier::query()->delete();
        ResolutionPricing::query()->delete();
        User::query()->update(['plan_id' => null]);
        Plan::query()->delete();

        $calculator = new CreditCalculator();

        // Fallback: uses config daemon.credit_matrix (per_second=1000, min_cost=5000)
        $this->assertEquals(5000, $calculator->calculate(5, '720p'));   // 5*1000 = 5000
        $this->assertEquals(10000, $calculator->calculate(5, '1080p')); // min cost 10000
        $this->assertEquals(5000, $calculator->calculate(1, '720p'));   // min cost 5000
        $this->assertEquals(25000, $calculator->calculate(25, '720p')); // 25*1000
    }

    public function test_user_has_enough_credits(): void
    {
        $this->assertTrue($this->user->hasEnoughCredits(50));
        $this->assertFalse($this->user->hasEnoughCredits(200));
    }

    public function test_render_job_belongs_to_user(): void
    {
        $job = RenderJob::create([
            'uuid' => 'test-uuid-123',
            'user_id' => $this->user->id,
            'status' => 'created',
            'prompt' => 'Test prompt',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 50,
        ]);

        $this->assertEquals($this->user->id, $job->user_id);
        $this->assertFalse($job->isTerminal());
        $this->assertEquals('created', $job->status);
    }

    public function test_job_lifecycle(): void
    {
        $job = RenderJob::create([
            'uuid' => 'test-uuid-456',
            'user_id' => $this->user->id,
            'status' => 'created',
            'prompt' => 'Test lifecycle',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 50,
        ]);

        $job->markAsQueued();
        $this->assertEquals('queued', $job->status);

        $job->markAsCompleted('/path/to/video.mp4');
        $this->assertEquals('completed', $job->status);
        $this->assertTrue($job->isTerminal());
    }
}
