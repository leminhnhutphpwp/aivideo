<?php

namespace Tests\Feature;

use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Models\StoryboardReference;
use App\Models\User;
use App\Models\VideoType;
use App\Models\Plan;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\CreditSetting;
use App\Jobs\AnalyzeStoryboardJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class StoryboardTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed pricing data for tests
        VideoType::create([
            'code' => 'ugc_review',
            'name' => 'UGC Review',
            'base_credits' => 250,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        VideoType::create([
            'code' => 'storyboard_video',
            'name' => 'Storyboard Video',
            'base_credits' => 250,
            'is_active' => true,
            'sort_order' => 6,
        ]);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
        ]);

        Plan::create([
            'slug' => 'pro',
            'name' => 'Pro',
            'quality_multiplier' => 1.5,
            'max_concurrent_jobs' => 3,
            'queue_priority' => 'high',
            'monthly_credits' => 1000,
        ]);

        Plan::create([
            'slug' => 'studio',
            'name' => 'Studio',
            'quality_multiplier' => 2.0,
            'max_concurrent_jobs' => 10,
            'queue_priority' => 'high',
            'monthly_credits' => 2000,
        ]);

        // Seed DurationTier data needed by PricingCalculator
        DurationTier::create([
            'code' => '5s',
            'name' => '5 Seconds',
            'seconds' => 5,
            'multiplier' => 1.0,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        DurationTier::create([
            'code' => '10s',
            'name' => '10 Seconds',
            'seconds' => 10,
            'multiplier' => 1.5,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        DurationTier::create([
            'code' => '15s',
            'name' => '15 Seconds',
            'seconds' => 15,
            'multiplier' => 2.0,
            'is_active' => true,
            'sort_order' => 3,
        ]);

        // Seed ResolutionPricing data needed by PricingCalculator
        ResolutionPricing::create([
            'code' => '720p',
            'name' => 'HD 720p',
            'width' => 1280,
            'height' => 720,
            'multiplier' => 1.0,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        ResolutionPricing::create([
            'code' => '1080p',
            'name' => 'Full HD 1080p',
            'width' => 1920,
            'height' => 1080,
            'multiplier' => 1.5,
            'is_active' => true,
            'sort_order' => 2,
        ]);

        // Seed CreditSetting data needed by PricingCalculator
        CreditSetting::create([
            'key' => 'exchange_rate',
            'value' => 0.1,
            'label' => 'Exchange Rate',
            'unit' => 'credits/VND',
            'description' => 'Credits per VND',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $freePlan = Plan::where('slug', 'free')->first();
        $this->user = User::factory()->create([
            'credits' => 10000,
            'plan_id' => $freePlan->id,
        ]);
    }

    public function test_create_storyboard_with_scenes(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Test Storyboard',
            'description' => 'A test storyboard',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1 prompt',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2 prompt',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $this->assertEquals(2, $storyboard->scenes()->count());
        $this->assertEquals('draft', $storyboard->status);
    }

    public function test_storyboard_belongs_to_user(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'User Storyboard',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->assertEquals($this->user->id, $storyboard->user_id);
        $this->assertTrue($storyboard->user->is($this->user));
    }

    public function test_storyboard_uuid_auto_generation(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'UUID Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->assertNotNull($storyboard->uuid);
        $this->assertMatchesRegularExpression(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/',
            $storyboard->uuid
        );
    }

    public function test_calculate_credits_cost(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Cost Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $storyboard->refresh();
        $expectedCost = 250 * 2 * 1.0; // base_credits * scenes * quality_multiplier
        $this->assertEquals($expectedCost, $storyboard->calculateCreditsCost());
    }

    public function test_storyboard_lifecycle(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Lifecycle Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $storyboard->markAsAnalyzing();
        $this->assertEquals('analyzing', $storyboard->status);

        $storyboard->markAsAnalyzed(['test' => 'data']);
        $this->assertEquals('analyzed', $storyboard->status);
        $this->assertEquals(['test' => 'data'], $storyboard->analysis_result);

        $storyboard->markAsRendering();
        $this->assertEquals('rendering', $storyboard->status);

        $storyboard->markAsCompleted('/path/to/output.mp4');
        $this->assertEquals('completed', $storyboard->status);
        $this->assertTrue($storyboard->isTerminal());
    }

    public function test_storyboard_failed_status(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Failed Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $storyboard->markAsFailed('Test error message');
        $this->assertEquals('failed', $storyboard->status);
        $this->assertEquals('Test error message', $storyboard->error_message);
        $this->assertTrue($storyboard->isTerminal());
    }

    public function test_is_renderable(): void
    {
        $draft = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Draft',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $analyzed = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Analyzed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'analyzed',
        ]);

        $completed = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
        ]);

        $this->assertTrue($draft->isRenderable());
        $this->assertTrue($analyzed->isRenderable());
        $this->assertFalse($completed->isRenderable());
    }

    public function test_scene_relationship(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Scene Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Test scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $this->assertTrue($scene->storyboard->is($storyboard));
    }

    public function test_reference_relationship(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Reference Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $ref = StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'character',
            'media_path' => '/uploads/character.jpg',
            'description' => 'Main character',
            'sort_order' => 1,
        ]);

        $this->assertTrue($ref->storyboard->is($storyboard));
        $this->assertEquals('character', $ref->type);
    }

    public function test_scene_lifecycle(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Scene Lifecycle',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Test scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        $scene->markAsQueued();
        $this->assertEquals('queued', $scene->status);

        $scene->markAsRendering();
        $this->assertEquals('rendering', $scene->status);

        $scene->markAsCompleted('/path/to/scene.mp4', '/path/to/thumb.jpg');
        $this->assertEquals('completed', $scene->status);
        $this->assertTrue($scene->isTerminal());
    }

    public function test_scene_failed_status(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Scene Failed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Test scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $scene->markAsFailed('Render error');
        $this->assertEquals('failed', $scene->status);
        $this->assertEquals('Render error', $scene->error_message);
    }

    public function test_reference_scopes(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Reference Scopes',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'character',
            'media_path' => '/uploads/char1.jpg',
            'sort_order' => 1,
        ]);

        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'product',
            'media_path' => '/uploads/prod1.jpg',
            'sort_order' => 2,
        ]);

        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'background',
            'media_path' => '/uploads/bg1.jpg',
            'sort_order' => 3,
        ]);

        $this->assertEquals(1, StoryboardReference::characters()->count());
        $this->assertEquals(1, StoryboardReference::products()->count());
        $this->assertEquals(1, StoryboardReference::backgrounds()->count());
    }

    public function test_update_credits_cost(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Cost Update',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
            'credits_cost' => 0,
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 3,
            'prompt' => 'Scene 3',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $storyboard->updateCreditsCost();
        $storyboard->refresh();

        $this->assertEquals(750, $storyboard->credits_cost); // 250 * 3 * 1.0
    }

    public function test_storyboard_for_user_scope(): void
    {
        $user2 = User::factory()->create(['credits' => 10000]);

        $sb1 = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'User 1 Storyboard',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $sb2 = Storyboard::create([
            'user_id' => $user2->id,
            'title' => 'User 2 Storyboard',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $user1Storyboards = Storyboard::forUser($this->user)->get();
        $this->assertTrue($user1Storyboards->contains($sb1));
        $this->assertFalse($user1Storyboards->contains($sb2));
    }

    public function test_premium_quality_multiplier(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Premium Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'premium',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $storyboard->refresh();
        $expectedCost = 250 * 1 * 1.5; // base_credits * scenes * premium_multiplier
        $this->assertEquals($expectedCost, $storyboard->calculateCreditsCost());
    }

    public function test_analyze_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Analyze Test',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        // Add a scene
        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'A person walking in a park',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        // Add references
        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'character',
            'media_path' => '/uploads/person.jpg',
            'description' => 'A person wearing blue jeans and white shirt',
            'sort_order' => 1,
        ]);

        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'background',
            'media_path' => '/uploads/park.jpg',
            'description' => 'A sunny park with green grass and trees',
            'sort_order' => 2,
        ]);

        // Call analyze endpoint
        $response = $this->postJson("/api/storyboards/{$storyboard->uuid}/analyze");

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'status',
                'message',
            ],
        ]);

        // Check that the response indicates analysis started or completed
        $status = $response->json('data.status');
        $message = $response->json('data.message');
        $this->assertTrue(
            $status === 'analyzing' || $status === 'analyzed',
            "Status should be 'analyzing' or 'analyzed', got '$status'"
        );
        $this->assertTrue(
            str_contains($message, 'Storyboard analysis started') ||
            str_contains($message, 'Storyboard analysis completed'),
            "Message should indicate analysis started or completed, got '$message'"
        );

        // The storyboard should eventually be analyzed (either immediately or after queue processing)
        // In testing environment with sync queue, it might be processed immediately
        $this->assertEquals('analyzed', $storyboard->fresh()->status);
        $this->assertNotNull($storyboard->fresh()->analysis_result);
        $this->assertNotNull($storyboard->fresh()->consistency_score);

        // Check that a scene was updated with enriched prompt
        $this->assertNotNull($scene->fresh()->enriched_prompt);
        $this->assertStringContainsString('A person wearing blue jeans and white shirt', $scene->fresh()->enriched_prompt);
        $this->assertStringContainsString('A sunny park with green grass and trees', $scene->fresh()->enriched_prompt);

        // Note: Queue assertions don't work with sync driver in the same way
        // The job is processed immediately, so we can verify it worked by checking the results above
    }

    public function test_scene_new_fields_persist(): void
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'New Fields Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'voice_mood' => 'energetic',
            'background_music' => 'bg_music.mp3',
            'voice' => 'voice_id_123',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'A cinematic shot',
            'duration_seconds' => 8,
            'camera_movement' => 'Pan Left',
            'lighting' => 'Golden Hour',
            'style' => 'Cinematic',
            'mood' => 'Dramatic',
            'negative_prompt' => 'blurry, low quality',
            'reference_image' => 'ref_shot.jpg',
            'narration' => 'This is the opening scene',
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
        ]);

        $this->assertEquals('Cinematic', $scene->style);
        $this->assertEquals('Dramatic', $scene->mood);
        $this->assertEquals('blurry, low quality', $scene->negative_prompt);
        $this->assertEquals('ref_shot.jpg', $scene->reference_image);
        $this->assertEquals('This is the opening scene', $scene->narration);
        $this->assertEquals('energetic', $storyboard->voice_mood);
        $this->assertEquals('bg_music.mp3', $storyboard->background_music);
        $this->assertEquals('voice_id_123', $storyboard->voice);
    }

    public function test_api_store_scene_with_new_fields(): void
    {
        $proPlan = Plan::where('slug', 'pro')->first();
        $this->user->update(['plan_id' => $proPlan->id]);
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'New Fields API Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'voice_mood' => 'professional',
            'background_music' => 'corporate.mp3',
            'voice' => 'en-US-Wavenet-D',
            'scenes' => [
                [
                    'prompt' => 'Scene one',
                    'duration_seconds' => 5,
                    'camera_movement' => 'Dolly',
                    'lighting' => 'Studio Soft',
                    'style' => 'Realistic',
                    'mood' => 'Peaceful',
                    'negative_prompt' => 'grainy',
                    'reference_image' => 'scene1_ref.png',
                    'narration' => 'Welcome to scene one',
                    'aspect_ratio' => '16:9',
                    'resolution' => '1080p',
                ],
                [
                    'prompt' => 'Scene two',
                    'duration_seconds' => 8,
                    'style' => 'Minimalist',
                    'mood' => 'Energetic',
                    'aspect_ratio' => '9:16',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonStructure(['data']);

        $storyboard = Storyboard::where('uuid', $response->json('data.uuid'))->first();
        $this->assertNotNull($storyboard);
        $this->assertEquals('corporate.mp3', $storyboard->background_music);
        $this->assertEquals('en-US-Wavenet-D', $storyboard->voice);

        $scenes = $storyboard->scenes;
        $this->assertCount(2, $scenes);

        $scene1 = $scenes->firstWhere('scene_number', 1);
        $this->assertEquals('Realistic', $scene1->style);
        $this->assertEquals('Peaceful', $scene1->mood);
        $this->assertEquals('grainy', $scene1->negative_prompt);
        $this->assertEquals('scene1_ref.png', $scene1->reference_image);
        $this->assertEquals('Welcome to scene one', $scene1->narration);
        $this->assertEquals('Dolly', $scene1->camera_movement);
        $this->assertEquals('Studio Soft', $scene1->lighting);
    }

    public function test_analyze_storyboard_unauthenticated(): void
    {
        // Create a temporary user for this test, then not authenticate
        $tempUser = User::factory()->create();
        $storyboard = Storyboard::create([
            'user_id' => $tempUser->id,
            'title' => 'Unauthenticated Test',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $response = $this->postJson("/api/storyboards/{$storyboard->uuid}/analyze");

        $response->assertUnauthorized();
    }

    public function test_analyze_storyboard_forbidden(): void
    {
        $otherUser = User::factory()->create();
        $storyboard = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Forbidden Test',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');

        $response = $this->postJson("/api/storyboards/{$storyboard->uuid}/analyze");

        $response->assertForbidden();
    }

    public function test_update_storyboard_title_and_description(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Original Title',
            'description' => 'Original desc',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene1 = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1 original',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'title' => 'Updated Title',
            'description' => 'Updated desc',
            'scenes' => [
                [
                    'id' => $scene1->id,
                    'prompt' => 'Scene 1 updated',
                    'duration_seconds' => 8,
                    'aspect_ratio' => '16:9',
                    'resolution' => '1080p',
                ],
                [
                    'prompt' => 'Brand new scene 2',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '9:16',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.title', 'Updated Title');
        $response->assertJsonPath('data.description', 'Updated desc');

        $storyboard->refresh();
        $this->assertEquals('Updated Title', $storyboard->title);
        $this->assertEquals('Updated desc', $storyboard->description);

        $scenes = $storyboard->scenes()->orderBy('scene_number')->get();
        $this->assertCount(2, $scenes);
        $this->assertEquals('Scene 1 updated', $scenes[0]->prompt);
        $this->assertEquals(8, $scenes[0]->duration_seconds);
        $this->assertEquals('1080p', $scenes[0]->resolution);
        $this->assertEquals('Brand new scene 2', $scenes[1]->prompt);
    }

    public function test_update_storyboard_replaces_references(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Ref test',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene with refs',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2 with refs',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'character',
            'media_path' => 'old_char.png',
            'description' => 'Old character',
            'sort_order' => 0,
        ]);

        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'scenes' => [
                ['prompt' => 'Scene 1', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['prompt' => 'Scene 2', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
            'references' => [
                ['type' => 'character', 'media_path' => 'new_char.png', 'description' => 'New main character'],
                ['type' => 'background', 'media_path' => 'bg_village.jpg', 'description' => 'Village background'],
            ],
        ]);

        $response->assertOk();

        $storyboard->refresh();
        $refs = $storyboard->references;
        $this->assertCount(2, $refs);
        $this->assertEquals('new_char.png', $refs->firstWhere('type', 'character')->media_path);
        $this->assertEquals('New main character', $refs->firstWhere('type', 'character')->description);
        $this->assertEquals('bg_village.jpg', $refs->firstWhere('type', 'background')->media_path);
    }

    public function test_update_storyboard_fails_when_not_draft(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed SB',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'title' => 'Should not work',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('message', 'Chỉ sửa được storyboard ở trạng thái nháp');
    }

    public function test_update_storyboard_fails_for_other_user(): void
    {
        $otherUser = User::factory()->create();
        $storyboard = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');

        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'title' => 'Hacked',
        ]);

        $response->assertForbidden();
    }

    public function test_update_storyboard_recalculates_credits(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Cost test',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        $storyboard->updateCreditsCost();
        $originalCost = $storyboard->fresh()->credits_cost;

        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'scenes' => [
                ['prompt' => 'Scene 1', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['prompt' => 'Scene 2', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['prompt' => 'Scene 3 (new)', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertOk();
        $storyboard->refresh();
        $this->assertNotEquals($originalCost, $storyboard->credits_cost);
        $this->assertEquals(750, $storyboard->credits_cost); // 250 * 3 * 1.0
    }

    public function test_update_storyboard_with_minimum_scenes_succeeds(): void
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Min scenes',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        // Validation rule is min:1, so 1 scene is valid
        $response = $this->putJson("/api/storyboards/{$storyboard->uuid}", [
            'scenes' => [
                ['prompt' => 'Only one scene', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertOk();
    }

    public function test_scene_parent_child_relationship(): void
    {
        $storyboard = $this->user->storyboards()->create([
            'title' => 'Tree Test', 'video_type' => 'ugc_review', 'quality_tier' => 'standard', 'status' => 'draft',
        ]);

        $parent = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 1,
            'prompt' => 'Parent scene', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending',
        ]);

        $child = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 2,
            'prompt' => 'Child scene', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p',
            'status' => 'pending', 'parent_scene_id' => $parent->id,
        ]);

        $this->assertEquals($parent->id, $child->parent->id);
        $this->assertCount(1, $parent->children);
        $this->assertEquals($child->id, $parent->children->first()->id);
    }

    public function test_scene_cycle_detection(): void
    {
        $storyboard = $this->user->storyboards()->create([
            'title' => 'Cycle Test', 'video_type' => 'ugc_review', 'quality_tier' => 'standard', 'status' => 'draft',
        ]);

        $a = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 1,
            'prompt' => 'A', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending',
        ]);
        $b = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 2,
            'prompt' => 'B', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending', 'parent_scene_id' => $a->id,
        ]);
        $c = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 3,
            'prompt' => 'C', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending', 'parent_scene_id' => $b->id,
        ]);

        // C → B → A, trying to set A's parent to C would create a cycle
        $this->assertTrue(StoryboardScene::wouldCreateCycle($storyboard->id, $a->id, $c->id));
        // B → C creates cycle because C is already descendant of B
        $this->assertTrue(StoryboardScene::wouldCreateCycle($storyboard->id, $b->id, $c->id));
        // A → C is valid (C is not ancestor of A)
        $this->assertFalse(StoryboardScene::wouldCreateCycle($storyboard->id, $c->id, $a->id));
    }

    public function test_root_scope(): void
    {
        $storyboard = $this->user->storyboards()->create([
            'title' => 'Root Test', 'video_type' => 'ugc_review', 'quality_tier' => 'standard', 'status' => 'draft',
        ]);

        $root1 = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 1,
            'prompt' => 'Root 1', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending',
        ]);
        $root2 = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 2,
            'prompt' => 'Root 2', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending',
        ]);
        StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 3,
            'prompt' => 'Child', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p',
            'status' => 'pending', 'parent_scene_id' => $root1->id,
        ]);

        $roots = StoryboardScene::where('storyboard_id', $storyboard->id)->root()->get();
        $this->assertCount(2, $roots);
    }

    public function test_scene_position_fields(): void
    {
        $storyboard = $this->user->storyboards()->create([
            'title' => 'Position Test', 'video_type' => 'ugc_review', 'quality_tier' => 'standard', 'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 1,
            'prompt' => 'Pos', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p',
            'status' => 'pending', 'position_x' => 100.5, 'position_y' => 200.3,
        ]);

        $this->assertEquals(100.5, $scene->fresh()->position_x);
        $this->assertEquals(200.3, $scene->fresh()->position_y);
    }

    public function test_api_create_storyboard_with_tree(): void
    {
        $payload = [
            'title' => 'Tree Storyboard',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'scenes' => [
                [
                    '_key' => 'root1',
                    'parent_key' => null,
                    'prompt' => 'Root scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'position_x' => 100,
                    'position_y' => 200,
                ],
                [
                    '_key' => 'root2',
                    'parent_key' => null,
                    'prompt' => 'Root scene 2',
                    'duration_seconds' => 3,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'position_x' => 500,
                    'position_y' => 200,
                ],
                [
                    '_key' => 'child1',
                    'parent_key' => 'root1',
                    'prompt' => 'Child of root 1',
                    'duration_seconds' => 8,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'edge_label' => 'Option A',
                    'position_x' => 100,
                    'position_y' => 400,
                ],
                [
                    '_key' => 'child2',
                    'parent_key' => 'root1',
                    'prompt' => 'Another child',
                    'duration_seconds' => 8,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'edge_label' => 'Option B',
                    'position_x' => 400,
                    'position_y' => 400,
                ],
            ],
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/storyboards', $payload);

        $response->assertStatus(201);
        $data = $response->json('data');

        $storyboard = Storyboard::where('uuid', $data['uuid'])->first();
        $roots = $storyboard->scenes()->root()->get();
        $this->assertCount(2, $roots, 'Should have 2 root scenes');

        $root1 = $roots->firstWhere('prompt', 'Root scene 1');
        $this->assertNotNull($root1);
        $this->assertCount(2, $root1->children, 'Root1 should have 2 children');

        $child1 = $root1->children->firstWhere('prompt', 'Child of root 1');
        $this->assertNotNull($child1);
        $this->assertEquals('Option A', $child1->edge_label);

        $this->assertEquals(100.0, $root1->position_x);
        $this->assertEquals(200.0, $root1->position_y);
    }

    public function test_api_cycle_detection_in_store(): void
    {
        $payload = [
            'title' => 'Cycle Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'scenes' => [
                [
                    '_key' => 'a',
                    'parent_key' => null,
                    'prompt' => 'Scene A',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    '_key' => 'b',
                    'parent_key' => 'a',
                    'prompt' => 'Scene B',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    '_key' => 'c',
                    'parent_key' => 'c', // Self-reference
                    'prompt' => 'Self cycle',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson('/api/storyboards', $payload);

        $response->assertStatus(422);
        $this->assertStringContainsString('vòng lặp', $response->json('message'));
    }

    public function test_is_descendant_of(): void
    {
        $storyboard = $this->user->storyboards()->create([
            'title' => 'Descendant Test', 'video_type' => 'ugc_review', 'quality_tier' => 'standard', 'status' => 'draft',
        ]);

        $a = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 1,
            'prompt' => 'A', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p', 'status' => 'pending',
        ]);
        $b = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 2,
            'prompt' => 'B', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p',
            'status' => 'pending', 'parent_scene_id' => $a->id,
        ]);
        $c = StoryboardScene::create([
            'storyboard_id' => $storyboard->id, 'scene_number' => 3,
            'prompt' => 'C', 'duration_seconds' => 5,
            'aspect_ratio' => '16:9', 'resolution' => '720p',
            'status' => 'pending', 'parent_scene_id' => $b->id,
        ]);

        $this->assertTrue($c->isDescendantOf($a->id));
        $this->assertTrue($c->isDescendantOf($b->id));
        $this->assertTrue($b->isDescendantOf($a->id));
        $this->assertFalse($a->isDescendantOf($b->id));
        $this->assertFalse($b->isDescendantOf($c->id));
        $this->assertEquals([$b->id, $a->id], $c->getAncestorIds());
        $this->assertEquals([$a->id], $b->getAncestorIds());
        $this->assertEmpty($a->getAncestorIds());
    }
}
