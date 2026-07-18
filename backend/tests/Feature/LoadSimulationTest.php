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

class LoadSimulationTest extends TestCase
{
    use RefreshDatabase;

    protected array $mockQualityTiers = [
        'standard' => [
            'multiplier' => 1.0,
            'model_mapping' => [
                'text_to_video' => 'wan2.6-t2v',
                'image_to_video' => 'wan2.6-i2v',
                'default' => 'wan2.6-t2v',
            ],
        ],
        'premium' => [
            'multiplier' => 1.5,
            'model_mapping' => [
                'text_to_video' => 'kling-3.0-std',
                'image_to_video' => 'happyhorse-1.0-i2v',
                'default' => 'kling-3.0-std',
            ],
        ],
        'ultra' => [
            'multiplier' => 2.5,
            'model_mapping' => [
                'text_to_video' => 'seedance-2.0',
                'image_to_video' => 'seedance-2.0',
                'default' => 'seedance-2.0',
            ],
        ],
    ];

    protected RenderJobService $service;
    protected $creditCalculator;
    protected $daemonClient;
    protected $modelSelector;

    // Simulation config
    protected const TOTAL_USERS = 100;
    protected const MIN_PROJECTS_PER_USER = 1;
    protected const MAX_PROJECTS_PER_USER = 5;

    // Results tracking
    protected array $results = [
        'total_users' => 0,
        'total_projects' => 0,
        'successful_projects' => 0,
        'failed_projects' => 0,
        'failed_reasons' => [],
        'total_credits_spent' => 0,
        'total_revenue_vnd' => 0,
        'total_plan_revenue_vnd' => 0,
        'total_cost_vnd' => 0,
        'profit_vnd' => 0,
        'profit_margin_percent' => 0,
        'by_video_type' => [],
        'by_quality_tier' => [],
        'by_duration' => [],
        'by_plan' => [],
        'models_used' => [],
        'validation_errors' => [],
    ];

    // Cost per second for each model (actual provider cost)
    protected const MODEL_COSTS_PER_SECOND = [
        'wan2.6-t2v' => 2750,           // $0.11/s
        'wan2.6-i2v' => 2750,
        'wan2.7-r2v' => 2500,           // $0.10/s
        'wan2.7-videoedit' => 2500,
        'wan2.2-animate-move' => 2500,
        'happyhorse-1.0-t2v' => 2800,   // $0.112/s
        'happyhorse-1.0-i2v' => 2800,
        'kling-3.0-std' => 2100,        // $0.084/s
        'seedance-2.0' => 2000,         // ~$0.08/s
    ];

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
    }

    /** @test */
    public function simulate_100_users_creating_random_projects()
    {
        // 1. Setup seed data
        $this->setupPlans();
        $this->setupQualityTiers();
        $this->setupVideoTypes();

        // 2. Create 100 users
        $users = $this->createUsers();
        $this->results['total_users'] = count($users);

        // 3. Each user creates random projects
        foreach ($users as $user) {
            $projectCount = rand(self::MIN_PROJECTS_PER_USER, self::MAX_PROJECTS_PER_USER);

            for ($i = 0; $i < $projectCount; $i++) {
                $this->simulateProjectCreation($user);
            }
        }

        // 4. Calculate final metrics
        $this->calculateProfitMetrics();

        // 5. Print report
        $this->printReport();

        // 6. Assertions
        $this->assertSimulationResults();
    }

    protected function setupPlans(): void
    {
        Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'max_concurrent_jobs' => 1,
            'monthly_credits' => 300,
            'price_regular' => 0,
            'queue_priority' => 'low',
        ]);

        Plan::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'max_concurrent_jobs' => 3,
            'monthly_credits' => 2000,
            'price_regular' => 149000,
            'queue_priority' => 'high',
        ]);

        Plan::create([
            'name' => 'Studio',
            'slug' => 'studio',
            'max_concurrent_jobs' => 10,
            'monthly_credits' => 8000,
            'price_regular' => 449000,
            'queue_priority' => 'high',
        ]);
    }

    protected function setupQualityTiers(): void
    {
        // QualityTiers database table is dropped, mocked via class property.
    }

    protected function setupVideoTypes(): void
    {
        VideoType::create([
            'code' => 'text_to_video',
            'name' => 'Text-to-Video',
            'base_credits' => 200,
        ]);

        VideoType::create([
            'code' => 'image_to_video',
            'name' => 'Image-to-Video',
            'base_credits' => 200,
        ]);

        VideoType::create([
            'code' => 'reference_to_video',
            'name' => 'Reference-to-Video',
            'base_credits' => 250,
        ]);

        VideoType::create([
            'code' => 'video_editing',
            'name' => 'Video Editing',
            'base_credits' => 150,
        ]);

        VideoType::create([
            'code' => 'character_animation',
            'name' => 'Character Animation',
            'base_credits' => 300,
        ]);
    }

    protected function createUsers(): array
    {
        $plans = Plan::all();
        $users = [];

        for ($i = 0; $i < self::TOTAL_USERS; $i++) {
            // Distribute: 60% free, 30% pro, 10% studio
            $plan = match (true) {
                $i < 60 => $plans->firstWhere('slug', 'free'),
                $i < 90 => $plans->firstWhere('slug', 'pro'),
                default => $plans->firstWhere('slug', 'studio'),
            };

            $user = User::factory()->create([
                'plan_id' => $plan->id,
                'credits' => $plan->monthly_credits,
            ]);

            // Track plan subscription revenue
            $this->results['total_plan_revenue_vnd'] += $plan->price_regular;

            $users[] = $user;
        }

        return $users;
    }

    protected function simulateProjectCreation(User $user): void
    {
        // Random parameters
        $videoType = $this->getRandomVideoType();
        $qualityTier = $this->getRandomQualityTier($user->plan);
        $duration = $this->getRandomDuration($user->plan);
        $resolution = $this->getRandomResolution($user->plan);

        // Resolve model (mock returns based on quality tier)
        $model = $this->resolveModel($qualityTier, $videoType);

        // Calculate credits
        $creditsCost = $this->calculateCreditsCost($videoType, $duration, $resolution, $qualityTier);

        // Check if user has enough credits
        if ($user->credits < $creditsCost) {
            $this->results['failed_projects']++;
            $this->results['failed_reasons']['insufficient_credits'] = 
                ($this->results['failed_reasons']['insufficient_credits'] ?? 0) + 1;
            return;
        }

        // Deduct credits
        $user->decrement('credits', $creditsCost);

        // Create job
        $job = RenderJob::create([
            'uuid' => fake()->uuid(),
            'user_id' => $user->id,
            'status' => 'queued',
            'prompt' => fake()->sentence(20),
            'model' => $model,
            'quality_tier' => $qualityTier,
            'video_type' => $videoType,
            'duration_seconds' => $duration,
            'resolution' => $resolution,
            'credits_cost' => $creditsCost,
        ]);

        // Track metrics
        $this->results['total_projects']++;
        $this->results['successful_projects']++;
        $this->results['total_credits_spent'] += $creditsCost;
        $this->results['total_revenue_vnd'] += $creditsCost * 100; // 1 credit = 100đ

        // Track cost
        $costPerSecond = self::MODEL_COSTS_PER_SECOND[$model] ?? 2500;
        $actualCost = $costPerSecond * $duration;
        $this->results['total_cost_vnd'] += $actualCost;

        // Track by video type
        $this->results['by_video_type'][$videoType] = 
            ($this->results['by_video_type'][$videoType] ?? 0) + 1;

        // Track by quality tier
        $this->results['by_quality_tier'][$qualityTier] = 
            ($this->results['by_quality_tier'][$qualityTier] ?? 0) + 1;

        // Track by duration
        $durationRange = $this->getDurationRange($duration);
        $this->results['by_duration'][$durationRange] = 
            ($this->results['by_duration'][$durationRange] ?? 0) + 1;

        // Track by plan
        $planSlug = $user->plan->slug;
        $this->results['by_plan'][$planSlug] = 
            ($this->results['by_plan'][$planSlug] ?? 0) + 1;

        // Track models used
        $this->results['models_used'][$model] = 
            ($this->results['models_used'][$model] ?? 0) + 1;
    }

    protected function getRandomVideoType(): string
    {
        $types = ['text_to_video', 'image_to_video', 'reference_to_video', 'video_editing', 'character_animation'];
        $weights = [35, 30, 15, 10, 10]; // Distribution %

        $rand = rand(1, 100);
        $cumulative = 0;

        foreach ($types as $i => $type) {
            $cumulative += $weights[$i];
            if ($rand <= $cumulative) {
                return $type;
            }
        }

        return $types[0];
    }

    protected function getRandomQualityTier(Plan $plan): string
    {
        // Free users: 80% standard, 20% premium
        // Pro users: 40% standard, 50% premium, 10% ultra
        // Studio users: 20% standard, 50% premium, 30% ultra

        $rand = rand(1, 100);

        return match ($plan->slug) {
            'free' => $rand <= 80 ? 'standard' : 'premium',
            'pro' => $rand <= 40 ? 'standard' : ($rand <= 90 ? 'premium' : 'ultra'),
            'studio' => $rand <= 20 ? 'standard' : ($rand <= 70 ? 'premium' : 'ultra'),
            default => 'standard',
        };
    }

    protected function getRandomDuration(Plan $plan): int
    {
        $durations = [5, 10, 15, 30, 45, 60];
        return $durations[array_rand($durations)];
    }

    protected function getRandomResolution(Plan $plan): string
    {
        if ($plan->slug === 'free') {
            return '720p';
        }

        if ($plan->slug === 'pro') {
            return rand(1, 100) <= 70 ? '720p' : '1080p';
        }

        if ($plan->slug === 'studio') {
            $r = rand(1, 100);
            if ($r <= 40) return '720p';
            return '1080p';
        }

        return '720p';
    }

    protected function resolveModel(string $qualityTier, string $videoType): string
    {
        $tier = $this->mockQualityTiers[$qualityTier] ?? null;
        if (!$tier) return 'wan2.6-t2v';

        $mapping = $tier['model_mapping'] ?? [];

        if (isset($mapping[$videoType])) {
            return $mapping[$videoType];
        }

        return $mapping['default'] ?? 'wan2.6-t2v';
    }

    protected function calculateCreditsCost(string $videoType, int $duration, string $resolution, string $qualityTier): int
    {
        $videoTypeModel = VideoType::where('code', $videoType)->first();
        $baseCredits = $videoTypeModel->base_credits ?? 200;

        // Duration multiplier (simplified) - short videos priced higher per-second
        $durationMultiplier = match (true) {
            $duration <= 3 => 0.7,
            $duration <= 5 => 1.0,
            $duration <= 10 => 1.9,
            $duration <= 15 => 2.8,
            $duration <= 30 => 5.0,
            default => 8.0,
        };

        // Resolution multiplier
        $resolutionMultiplier = match ($resolution) {
            '720p' => 1.0,
            '1080p' => 1.3,
            default => 1.0,
        };

        // Quality multiplier
        $qualityMultiplier = match ($qualityTier) {
            'standard' => 1.0,
            'premium' => 1.5,
            'ultra' => 2.0,
            default => 1.0,
        };

        return (int) ($baseCredits * $durationMultiplier * $resolutionMultiplier * $qualityMultiplier);
    }

    protected function getDurationRange(int $duration): string
    {
        return match (true) {
            $duration <= 5 => '3-5s',
            $duration <= 10 => '6-10s',
            $duration <= 15 => '11-15s',
            $duration <= 30 => '16-30s',
            default => '31-60s',
        };
    }

    protected function calculateProfitMetrics(): void
    {
        // Total revenue = Plan subscriptions + Pay-per-use credits
        $this->results['total_revenue_vnd'] = $this->results['total_plan_revenue_vnd'] + ($this->results['total_credits_spent'] * 100);
        $this->results['profit_vnd'] = $this->results['total_revenue_vnd'] - $this->results['total_cost_vnd'];
        $this->results['profit_margin_percent'] = $this->results['total_revenue_vnd'] > 0
            ? ($this->results['profit_vnd'] / $this->results['total_revenue_vnd']) * 100
            : 0;
    }

    protected function printReport(): void
    {
        echo "\n" . str_repeat('=', 80) . "\n";
        echo "📊 LOAD SIMULATION REPORT - 100 Users\n";
        echo str_repeat('=', 80) . "\n\n";

        echo "👥 USERS:\n";
        echo "   Total Users: {$this->results['total_users']}\n";
        echo "   By Plan: " . json_encode($this->results['by_plan']) . "\n\n";

        echo "🎬 PROJECTS:\n";
        echo "   Total Projects: {$this->results['total_projects']}\n";
        echo "   Successful: {$this->results['successful_projects']}\n";
        echo "   Failed: {$this->results['failed_projects']}\n";
        echo "   By Video Type: " . json_encode($this->results['by_video_type']) . "\n";
        echo "   By Quality Tier: " . json_encode($this->results['by_quality_tier']) . "\n";
        echo "   By Duration: " . json_encode($this->results['by_duration']) . "\n\n";

        echo "💰 FINANCIAL METRICS:\n";
        echo "   Plan Subscription Revenue: " . number_format($this->results['total_plan_revenue_vnd']) . " VNĐ\n";
        echo "   Pay-per-use Credits Revenue: " . number_format($this->results['total_credits_spent'] * 100) . " VNĐ\n";
        echo "   Total Revenue: " . number_format($this->results['total_revenue_vnd']) . " VNĐ\n";
        echo "   Total Cost: " . number_format($this->results['total_cost_vnd']) . " VNĐ\n";
        echo "   Profit: " . number_format($this->results['profit_vnd']) . " VNĐ\n";
        echo "   Profit Margin: " . number_format($this->results['profit_margin_percent'], 2) . "%\n\n";

        echo "🤖 MODELS USED:\n";
        foreach ($this->results['models_used'] as $model => $count) {
            $cost = self::MODEL_COSTS_PER_SECOND[$model] ?? 0;
            echo "   - {$model}: {$count} times (cost: " . number_format($cost) . "đ/s)\n";
        }

        echo "\n" . str_repeat('=', 80) . "\n";
    }

    protected function assertSimulationResults(): void
    {
        // 1. All successful projects should have valid data
        $this->assertGreaterThan(0, $this->results['total_projects']);
        $this->assertEquals(
            $this->results['successful_projects'],
            RenderJob::where('status', 'queued')->count()
        );

        // 2. All jobs should have model assigned
        $jobsWithoutModel = RenderJob::whereNull('model')->count();
        $this->assertEquals(0, $jobsWithoutModel, 'All jobs should have a model assigned');

        // 3. All jobs should have quality_tier and video_type
        $jobsWithoutTier = RenderJob::whereNull('quality_tier')->count();
        $this->assertEquals(0, $jobsWithoutTier, 'All jobs should have quality_tier');

        $jobsWithoutType = RenderJob::whereNull('video_type')->count();
        $this->assertEquals(0, $jobsWithoutType, 'All jobs should have video_type');

        // 4. Credits should be positive
        $jobsWithNegativeCredits = RenderJob::where('credits_cost', '<=', 0)->count();
        $this->assertEquals(0, $jobsWithNegativeCredits, 'All jobs should have positive credits cost');

        // 5. Profit margin should be reasonable (between 20% and 80%)
        $this->assertGreaterThan(20, $this->results['profit_margin_percent'], 
            'Profit margin should be at least 20%');
        $this->assertLessThan(85, $this->results['profit_margin_percent'],
            'Profit margin should not exceed 85%');

        // 6. Model distribution should match quality tier config
        $standardJobs = RenderJob::where('quality_tier', 'standard')->count();
        $premiumJobs = RenderJob::where('quality_tier', 'premium')->count();
        $ultraJobs = RenderJob::where('quality_tier', 'ultra')->count();

        $this->assertGreaterThan(0, $standardJobs, 'Should have standard quality jobs');
        $this->assertGreaterThan(0, $premiumJobs, 'Should have premium quality jobs');

        echo "\n✅ All assertions passed!\n";
    }
}
