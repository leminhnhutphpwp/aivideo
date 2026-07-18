<?php

namespace Tests\Feature;

use App\Models\CreditSetting;
use App\Models\DurationTier;
use App\Models\Plan;
use App\Models\ResolutionPricing;
use App\Models\Storyboard;
use App\Models\StoryboardReference;
use App\Models\StoryboardScene;
use App\Models\User;
use App\Models\VideoType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoryboardControllerTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed all pricing data needed by PricingCalculator
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

        CreditSetting::create([
            'key' => 'exchange_rate',
            'value' => 0.1,
            'label' => 'Exchange Rate',
            'unit' => 'credits/VND',
            'description' => 'Credits per VND',
            'is_active' => true,
            'sort_order' => 1,
        ]);

        $proPlan = Plan::where('slug', 'pro')->first();
        $this->user = User::factory()->create([
            'credits' => 10000,
            'plan_id' => $proPlan->id,
        ]);
    }

    // =========================================================================
    // A. STORYBOARD CREATE (ONE-SHOT / single_flow)
    // =========================================================================

    public function test_store_storyboard_single_flow_with_all_fields(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'One-Shot Storyboard',
            'description' => 'A single-flow storyboard',
            'video_type' => 'ugc_review',
            'render_mode' => 'single_flow',
            'total_duration' => 10,
            'driving_audio' => 'path/to/audio.wav',
            'first_frame_image' => 'path/to/image.jpg',
            'last_frame_image' => 'path/to/image2.jpg',
            'camera_movement' => 'Pan Left',
            'style' => 'Cinematic',
            'mood' => 'Dramatic',
            'lighting' => 'Golden Hour',
            'narration' => 'Opening narration',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    'prompt' => 'Scene 2',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $data = $response->json('data');

        $this->assertEquals('One-Shot Storyboard', $data['title']);
        $this->assertEquals('single_flow', $data['render_mode']);
        $this->assertEquals('path/to/audio.wav', $data['driving_audio']);
        $this->assertEquals('path/to/image.jpg', $data['first_frame_image']);
        $this->assertEquals('path/to/image2.jpg', $data['last_frame_image']);
        $this->assertEquals('Pan Left', $data['camera_movement']);
        $this->assertEquals('Cinematic', $data['style']);
        $this->assertEquals('Dramatic', $data['mood']);
        $this->assertEquals('Golden Hour', $data['lighting']);
        $this->assertEquals('Opening narration', $data['narration']);
        $this->assertCount(2, $data['scenes']);
        $this->assertEquals('draft', $data['status']);
    }

    public function test_store_storyboard_single_flow_defaults_render_mode(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Default Mode Storyboard',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        // multi_scene is disabled for launch (config storyboard.multi_scene_enabled=false),
        // so an omitted render_mode now defaults to single_flow.
        $this->assertEquals('single_flow', $response->json('data.render_mode'));
    }

    public function test_store_single_flow_shared_fields_at_storyboard_level(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Shared Skills Test',
            'video_type' => 'ugc_review',
            'render_mode' => 'single_flow',
            'driving_audio' => 'shared_audio.wav',
            'first_frame_image' => 'shared_first.jpg',
            'last_frame_image' => 'shared_last.jpg',
            'camera_movement' => 'Dolly In',
            'style' => 'Minimalist',
            'mood' => 'Calm',
            'lighting' => 'Soft',
            'narration' => 'Shared narration',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $sb = Storyboard::where('uuid', $response->json('data.uuid'))->first();

        $this->assertEquals('shared_audio.wav', $sb->driving_audio);
        $this->assertEquals('shared_first.jpg', $sb->first_frame_image);
        $this->assertEquals('shared_last.jpg', $sb->last_frame_image);
        $this->assertEquals('Dolly In', $sb->camera_movement);
        $this->assertEquals('Minimalist', $sb->style);
        $this->assertEquals('Calm', $sb->mood);
        $this->assertEquals('Soft', $sb->lighting);
        $this->assertEquals('Shared narration', $sb->narration);
    }

    public function test_store_single_flow_shared_fields_null_in_multi_scene(): void
    {
        config(['storyboard.multi_scene_enabled' => true]); // multi_scene gated off by default for launch
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Multi Scene No Shared',
            'video_type' => 'ugc_review',
            'render_mode' => 'multi_scene',
            'driving_audio' => 'should_be_null.wav',
            'first_frame_image' => 'should_be_null.jpg',
            'last_frame_image' => 'should_be_null2.jpg',
            'camera_movement' => 'Should be null',
            'style' => 'Should be null',
            'mood' => 'Should be null',
            'lighting' => 'Should be null',
            'narration' => 'Should be null',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $sb = Storyboard::where('uuid', $response->json('data.uuid'))->first();

        // In multi_scene mode, storyboard-level shared fields should be null
        $this->assertNull($sb->driving_audio);
        $this->assertNull($sb->first_frame_image);
        $this->assertNull($sb->last_frame_image);
        $this->assertNull($sb->camera_movement);
        $this->assertNull($sb->style);
        $this->assertNull($sb->mood);
        $this->assertNull($sb->lighting);
        $this->assertNull($sb->narration);
    }

    // =========================================================================
    // B. STORYBOARD CREATE (MULTI-SCENE)
    // =========================================================================

    public function test_store_storyboard_multi_scene_with_per_scene_fields(): void
    {
        config(['storyboard.multi_scene_enabled' => true]); // multi_scene gated off by default for launch
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Multi-Scene Storyboard',
            'video_type' => 'ugc_review',
            'render_mode' => 'multi_scene',
            'scenes' => [
                [
                    'prompt' => 'A hero standing on a mountain',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'camera_movement' => 'Pan Right',
                    'lighting' => 'Sunset',
                    'style' => 'Epic',
                    'mood' => 'Triumphant',
                    'negative_prompt' => 'blurry',
                    'reference_image' => 'path/to/ref.jpg',
                    'last_frame_image' => 'path/to/last.jpg',
                    'narration' => 'The hero arrives',
                ],
                [
                    'prompt' => 'A dragon flying over a castle',
                    'duration_seconds' => 8,
                    'aspect_ratio' => '9:16',
                    'resolution' => '1080p',
                    'camera_movement' => 'Drone Up',
                    'lighting' => 'Moonlight',
                    'style' => 'Fantasy',
                    'mood' => 'Mysterious',
                    'negative_prompt' => 'low quality',
                    'reference_image' => 'path/to/dragon_ref.jpg',
                    'last_frame_image' => 'path/to/dragon_last.jpg',
                    'narration' => 'The dragon appears',
                ],
            ],
        ]);

        $response->assertCreated();
        $data = $response->json('data');
        $this->assertCount(2, $data['scenes']);

        $sb = Storyboard::where('uuid', $data['uuid'])->first();
        $scenes = $sb->scenes()->orderBy('scene_number')->get();

        // Scene 1
        $this->assertEquals('Pan Right', $scenes[0]->camera_movement);
        $this->assertEquals('Sunset', $scenes[0]->lighting);
        $this->assertEquals('Epic', $scenes[0]->style);
        $this->assertEquals('Triumphant', $scenes[0]->mood);
        $this->assertEquals('blurry', $scenes[0]->negative_prompt);
        $this->assertEquals('path/to/ref.jpg', $scenes[0]->reference_image);
        $this->assertEquals('path/to/last.jpg', $scenes[0]->last_frame_image);
        $this->assertEquals('The hero arrives', $scenes[0]->narration);

        // Scene 2
        $this->assertEquals('Drone Up', $scenes[1]->camera_movement);
        $this->assertEquals('Moonlight', $scenes[1]->lighting);
        $this->assertEquals('Fantasy', $scenes[1]->style);
        $this->assertEquals('Mysterious', $scenes[1]->mood);
        $this->assertEquals('9:16', $scenes[1]->aspect_ratio);
        $this->assertEquals('1080p', $scenes[1]->resolution);
    }

    // --- Ghép cảnh (multi_scene) feature flag — disabled for launch -----------
    // Backend hard-block so a crafted API call can't bypass the disabled UI.
    // ▶ Re-enable: config storyboard.multi_scene_enabled / env STORYBOARD_MULTI_SCENE_ENABLED.

    public function test_store_rejects_multi_scene_when_disabled(): void
    {
        config(['storyboard.multi_scene_enabled' => false]);
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Blocked Multi Scene',
            'video_type' => 'ugc_review',
            'render_mode' => 'multi_scene',
            'scenes' => [
                ['prompt' => 'Scene 1', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('Ghép cảnh', $response->json('message'));
    }

    public function test_render_rejects_multi_scene_when_disabled(): void
    {
        config(['storyboard.multi_scene_enabled' => false]);
        $this->actingAs($this->user, 'api');

        // Pre-existing multi_scene draft (created directly, bypassing the store guard).
        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Old Multi Scene Draft',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'render_mode' => 'multi_scene',
            'status' => 'draft',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/render");

        $response->assertStatus(422);
        $this->assertStringContainsString('Ghép cảnh', $response->json('message'));
        // Must not have started rendering / burned an attempt.
        $this->assertEquals('draft', $sb->fresh()->status);
        $this->assertEquals(0, $sb->fresh()->render_attempts);
    }

    public function test_store_storyboard_minimal_valid(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Minimal',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'A simple scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
    }

    public function test_store_storyboard_fails_without_title(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('title');
    }

    public function test_store_storyboard_fails_without_video_type(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'No Video Type',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('video_type');
    }

    public function test_store_storyboard_fails_without_scenes(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'No Scenes',
            'video_type' => 'ugc_review',
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes');
    }

    public function test_store_storyboard_fails_with_empty_scenes(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Empty Scenes',
            'video_type' => 'ugc_review',
            'scenes' => [],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes');
    }

    public function test_store_storyboard_fails_with_too_many_scenes(): void
    {
        $this->actingAs($this->user, 'api');

        $scenes = [];
        for ($i = 0; $i < 21; $i++) {
            $scenes[] = [
                'prompt' => "Scene {$i}",
                'duration_seconds' => 5,
                'aspect_ratio' => '16:9',
                'resolution' => '720p',
            ];
        }

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Too Many Scenes',
            'video_type' => 'ugc_review',
            'scenes' => $scenes,
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes');
    }

    public function test_store_storyboard_fails_with_invalid_render_mode(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Bad Mode',
            'video_type' => 'ugc_review',
            'render_mode' => 'invalid_mode',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('render_mode');
    }

    public function test_store_storyboard_fails_with_invalid_aspect_ratio(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Bad Aspect',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '32:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes.0.aspect_ratio');
    }

    public function test_store_storyboard_fails_with_invalid_resolution(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Bad Resolution',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '4K',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes.0.resolution');
    }

    public function test_store_storyboard_fails_with_duration_too_short(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Too Short',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 1,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes.0.duration_seconds');
    }

    public function test_store_storyboard_fails_with_duration_too_long(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Too Long',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 31,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('scenes.0.duration_seconds');
    }

    public function test_store_storyboard_validates_references(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Refs Test',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
            'references' => [
                [
                    'type' => 'invalid_type',
                    'media_path' => '/uploads/test.jpg',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('references.0.type');
    }

    public function test_store_storyboard_with_references(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'With References',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
            'references' => [
                ['type' => 'character', 'media_path' => '/char.jpg', 'description' => 'Main hero'],
                ['type' => 'product', 'media_path' => '/product.jpg', 'description' => 'Product shot'],
                ['type' => 'background', 'media_path' => '/bg.jpg', 'description' => 'Forest'],
            ],
        ]);

        $response->assertCreated();
        $sb = Storyboard::where('uuid', $response->json('data.uuid'))->first();
        $this->assertCount(3, $sb->references);
    }

    public function test_store_storyboard_credits_reservation(): void
    {
        $this->actingAs($this->user, 'api');

        $initialCredits = $this->user->credits;

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Credits Test',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    'prompt' => 'Scene 2',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $this->user->refresh();
        $this->assertLessThan($initialCredits, $this->user->credits);
    }

    public function test_store_storyboard_insufficient_credits(): void
    {
        /** @var User $poorUser */
        $poorUser = User::factory()->create(['credits' => 1]);
        $this->actingAs($poorUser, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Poor User',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(402);
    }

    // =========================================================================
    // C. SHOW / INDEX
    // =========================================================================

    public function test_index_returns_paginated_storyboards(): void
    {
        $this->actingAs($this->user, 'api');

        // Create 3 storyboards
        for ($i = 0; $i < 3; $i++) {
            Storyboard::create([
                'user_id' => $this->user->id,
                'title' => "Storyboard {$i}",
                'video_type' => 'ugc_review',
                'quality_tier' => 'standard',
                'status' => 'draft',
            ]);
        }

        $response = $this->getJson('/api/storyboards');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_index_filters_by_status(): void
    {
        $this->actingAs($this->user, 'api');

        Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Draft SB',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed SB',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->getJson('/api/storyboards?status=draft');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Draft SB', $response->json('data.0.title'));
    }

    public function test_show_returns_storyboard_with_scenes_and_references(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Show Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        StoryboardReference::create([
            'storyboard_id' => $sb->id,
            'type' => 'character',
            'media_path' => '/char.jpg',
            'sort_order' => 0,
        ]);

        $response = $this->getJson("/api/storyboards/{$sb->uuid}");

        $response->assertOk();
        $data = $response->json('data');
        $this->assertEquals('Show Test', $data['title']);
        $this->assertCount(1, $data['scenes']);
        $this->assertCount(1, $data['references']);
    }

    public function test_show_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->getJson("/api/storyboards/{$sb->uuid}");

        $response->assertForbidden();
    }

    // =========================================================================
    // D. UPDATE
    // =========================================================================

    public function test_update_storyboard_title(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Original',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'title' => 'Updated Title',
        ]);

        $response->assertOk();
        $this->assertEquals('Updated Title', $sb->fresh()->title);
    }

    public function test_update_storyboard_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'title' => 'Hacked',
        ]);

        $response->assertForbidden();
    }

    public function test_update_storyboard_rejects_when_not_draft(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'title' => 'Should not work',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('message', 'Chỉ sửa được storyboard ở trạng thái nháp');
    }

    public function test_update_storyboard_scene_reorder(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Reorder Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        // Create 3 scenes
        $scene1 = StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);
        $scene2 = StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);
        $scene3 = StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 3,
            'prompt' => 'Scene 3',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        // Reorder: swap scene 1 and 3
        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'scenes' => [
                ['id' => $scene3->id, 'prompt' => 'Scene 3 reordered', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['id' => $scene2->id, 'prompt' => 'Scene 2', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['id' => $scene1->id, 'prompt' => 'Scene 1 reordered', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertOk();

        // Verify reorder
        $scenes = $sb->fresh()->scenes()->orderBy('scene_number')->get();
        $this->assertCount(3, $scenes);
        $this->assertEquals('Scene 3 reordered', $scenes[0]->prompt);
        $this->assertEquals('Scene 2', $scenes[1]->prompt);
        $this->assertEquals('Scene 1 reordered', $scenes[2]->prompt);
    }

    public function test_update_storyboard_deletes_removed_scenes(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Delete Scenes',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'Keep me',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 2,
            'prompt' => 'Delete me',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'scenes' => [
                ['prompt' => 'Keep me', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertOk();
        $this->assertCount(1, $sb->fresh()->scenes);
    }

    public function test_update_storyboard_recalculates_credits(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Cost Recalc',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
            'credits_cost' => 0,
        ]);

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'status' => 'pending',
        ]);

        $sb->updateCreditsCost();
        $originalCost = $sb->fresh()->credits_cost;

        $response = $this->putJson("/api/storyboards/{$sb->uuid}", [
            'scenes' => [
                ['prompt' => 'Scene 1', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['prompt' => 'Scene 2 (new)', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
                ['prompt' => 'Scene 3 (new)', 'duration_seconds' => 5, 'aspect_ratio' => '16:9', 'resolution' => '720p'],
            ],
        ]);

        $response->assertOk();
        $sb->refresh();
        $this->assertNotEquals($originalCost, $sb->credits_cost);
    }

    // =========================================================================
    // E. DOWNLOAD
    // =========================================================================

    public function test_download_returns_file_for_completed_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        // Create a temp file to simulate output
        $tempDir = storage_path('app/storyboards/test-uuid');
        if (!is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $testFile = $tempDir . '/final_output.mp4';
        file_put_contents($testFile, 'fake video content');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Download Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => 'storyboards/test-uuid/final_output.mp4',
        ]);

        $response = $this->getJson("/api/storyboards/{$sb->uuid}/download");

        // download() returns BinaryFileResponse, not JSON
        $this->assertFileExists($testFile);
        @unlink($testFile);
        @rmdir($tempDir);
    }

    public function test_download_returns_404_for_non_completed(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Not Done',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->get("/api/storyboards/{$sb->uuid}/download")
            ->assertStatus(404);
    }

    public function test_download_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => 'storyboards/test/output.mp4',
        ]);

        $this->actingAs($this->user, 'api');

        $this->get("/api/storyboards/{$sb->uuid}/download")
            ->assertStatus(403);
    }

    // =========================================================================
    // F. AUTH GUARD
    // =========================================================================

    public function test_unauthenticated_access_rejected(): void
    {
        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Auth Test',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->getJson("/api/storyboards/{$sb->uuid}")->assertUnauthorized();
        $this->postJson('/api/storyboards', ['title' => 'Test'])->assertUnauthorized();
        $this->putJson("/api/storyboards/{$sb->uuid}", ['title' => 'Test'])->assertUnauthorized();
        $this->deleteJson("/api/storyboards/{$sb->uuid}")->assertUnauthorized();
    }

    public function test_jwt_auth_works_with_acting_as(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->getJson('/api/storyboards');

        $response->assertOk();
    }

    // =========================================================================
    // G. DESTROY
    // =========================================================================

    public function test_destroy_draft_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Delete Me',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $sbId = $sb->id;

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'Scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response = $this->deleteJson("/api/storyboards/{$sb->uuid}");

        $response->assertOk();
        // Storyboard uses SoftDeletes now — verify soft delete
        $this->assertDatabaseHas('storyboards', ['id' => $sbId]);
        $this->assertNotNull(Storyboard::withTrashed()->find($sbId)->deleted_at);
        // Scenes should also be soft-deleted
        $scene = StoryboardScene::withTrashed()->where('storyboard_id', $sbId)->first();
        $this->assertNotNull($scene->deleted_at);
    }

    public function test_destroy_allows_completed_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->deleteJson("/api/storyboards/{$sb->uuid}");

        $response->assertStatus(200);
    }

    public function test_destroy_allows_failed_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Failed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'failed',
            'error_message' => 'Error',
        ]);

        $response = $this->deleteJson("/api/storyboards/{$sb->uuid}");

        $response->assertStatus(200);
    }

    public function test_destroy_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->deleteJson("/api/storyboards/{$sb->uuid}");

        $response->assertForbidden();
    }

    // =========================================================================
    // H. ANALYZE
    // =========================================================================

    public function test_analyze_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Analyze',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        StoryboardScene::create([
            'storyboard_id' => $sb->id,
            'scene_number' => 1,
            'prompt' => 'A person walking',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/analyze");

        $response->assertOk();
        $this->assertEquals('analyzed', $sb->fresh()->status);
        $this->assertNotNull($sb->fresh()->analysis_result);
    }

    public function test_analyze_rejects_non_draft(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Not Draft',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/analyze");

        $response->assertStatus(400);
    }

    public function test_analyze_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->postJson("/api/storyboards/{$sb->uuid}/analyze");

        $response->assertForbidden();
    }

    // =========================================================================
    // I. RENDER
    // =========================================================================

    public function test_render_rejects_non_renderable_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Not Renderable',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/render");

        $response->assertStatus(400);
    }

    public function test_render_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->postJson("/api/storyboards/{$sb->uuid}/render");

        $response->assertForbidden();
    }

    // =========================================================================
    // J. CANCEL
    // =========================================================================

    public function test_cancel_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'To Cancel',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/cancel");

        $response->assertOk();
        $response->assertJsonPath('data.status', 'failed');
        $this->assertEquals('failed', $sb->fresh()->status);
        $this->assertEquals('User cancelled', $sb->fresh()->error_message);
    }

    public function test_cancel_rejects_terminal_storyboard(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Completed',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'completed',
            'output_path' => '/video.mp4',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/cancel");

        $response->assertStatus(422);
    }

    // =========================================================================
    // K. COMPILE PROMPT
    // =========================================================================

    public function test_compile_prompt_rejects_multi_scene(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Multi Scene',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'render_mode' => 'multi_scene',
            'status' => 'draft',
        ]);

        $response = $this->postJson("/api/storyboards/{$sb->uuid}/compile-prompt");

        $response->assertStatus(400);
    }

    public function test_compile_prompt_forbidden_for_other_user(): void
    {
        /** @var User $otherUser */
        $otherUser = User::factory()->create(['credits' => 10000]);
        $sb = Storyboard::create([
            'user_id' => $otherUser->id,
            'title' => 'Not mine',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'render_mode' => 'single_flow',
            'status' => 'draft',
        ]);

        $this->actingAs($this->user, 'api');
        $response = $this->postJson("/api/storyboards/{$sb->uuid}/compile-prompt");

        $response->assertForbidden();
    }

    // =========================================================================
    // L. SCENE TREE / PARENT-CHILD RELATIONSHIPS
    // =========================================================================

    public function test_store_storyboard_with_scene_tree(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Tree Storyboard',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    '_key' => 'root1',
                    'prompt' => 'Root 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'position_x' => 100,
                    'position_y' => 200,
                ],
                [
                    '_key' => 'root2',
                    'prompt' => 'Root 2',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'position_x' => 500,
                    'position_y' => 200,
                ],
                [
                    '_key' => 'child1',
                    'parent_key' => 'root1',
                    'edge_label' => 'Option A',
                    'prompt' => 'Child of Root 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'position_x' => 100,
                    'position_y' => 400,
                ],
            ],
        ]);

        $response->assertCreated();
        $sb = Storyboard::where('uuid', $response->json('data.uuid'))->first();

        $roots = $sb->scenes()->root()->get();
        $this->assertCount(2, $roots);

        $root1 = $roots->firstWhere('prompt', 'Root 1');
        $this->assertCount(1, $root1->children);
        $this->assertEquals('Option A', $root1->children->first()->edge_label);
    }

    public function test_store_rejects_cycle_in_scene_tree(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Cycle Test',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    '_key' => 'a',
                    'prompt' => 'A',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    '_key' => 'b',
                    'parent_key' => 'a',
                    'prompt' => 'B',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    '_key' => 'c',
                    'parent_key' => 'c',
                    'prompt' => 'Self cycle',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertStringContainsString('vòng lặp', $response->json('message'));
    }

    // =========================================================================
    // M. VOICE MOOD VALIDATION
    // =========================================================================

    public function test_store_validates_voice_mood(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Bad Voice Mood',
            'video_type' => 'ugc_review',
            'voice_mood' => 'invalid_mood',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('voice_mood');
    }

    public function test_store_accepts_valid_voice_moods(): void
    {
        $this->actingAs($this->user, 'api');

        foreach (['energetic', 'calm', 'professional', 'friendly', 'dramatic'] as $mood) {
            $response = $this->postJson('/api/storyboards', [
                'title' => "Mood: {$mood}",
                'video_type' => 'ugc_review',
                'voice_mood' => $mood,
                'scenes' => [
                    [
                        'prompt' => 'Scene',
                        'duration_seconds' => 5,
                        'aspect_ratio' => '16:9',
                        'resolution' => '720p',
                    ],
                ],
            ]);

            $response->assertCreated();
        }
    }

    // =========================================================================
    // N. EDGE CASES
    // =========================================================================

    public function test_store_storyboard_max_title_length(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => str_repeat('A', 255),
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
    }

    public function test_store_storyboard_rejects_title_too_long(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => str_repeat('A', 256),
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertStatus(400);
        $response->assertJsonValidationErrors('title');
    }

    public function test_store_storyboard_with_max_scenes(): void
    {
        $this->actingAs($this->user, 'api');

        $scenes = [];
        for ($i = 0; $i < 20; $i++) {
            $scenes[] = [
                'prompt' => "Scene {$i}",
                'duration_seconds' => 5,
                'aspect_ratio' => '16:9',
                'resolution' => '720p',
            ];
        }

        $response = $this->postJson('/api/storyboards', [
            'title' => '20 Scenes',
            'video_type' => 'ugc_review',
            'scenes' => $scenes,
        ]);

        $response->assertCreated();
        $this->assertCount(20, $response->json('data.scenes'));
    }

    public function test_store_storyboard_scene_position_defaults(): void
    {
        $this->actingAs($this->user, 'api');

        $response = $this->postJson('/api/storyboards', [
            'title' => 'Position Defaults',
            'video_type' => 'ugc_review',
            'scenes' => [
                [
                    'prompt' => 'Scene 1',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
                [
                    'prompt' => 'Scene 2',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                ],
            ],
        ]);

        $response->assertCreated();
        $sb = Storyboard::where('uuid', $response->json('data.uuid'))->first();
        $scenes = $sb->scenes()->orderBy('scene_number')->get();

        // First scene at position 0, second at 300
        $this->assertEquals(0, $scenes[0]->position_x);
        $this->assertEquals(200, $scenes[0]->position_y);
        $this->assertEquals(300, $scenes[1]->position_x);
        $this->assertEquals(200, $scenes[1]->position_y);
    }

    public function test_storyboard_uuid_is_used_in_routes(): void
    {
        $this->actingAs($this->user, 'api');

        $sb = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'UUID Route',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        // Verify routes use UUID, not integer ID
        $this->getJson("/api/storyboards/{$sb->uuid}")->assertOk();
        $this->getJson("/api/storyboards/{$sb->id}")->assertNotFound();
    }
}
