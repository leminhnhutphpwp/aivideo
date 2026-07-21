<?php
namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Like;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Tag;
use App\Models\User;
use App\Settings\CommunitySettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

/**
 * Comprehensive test suite for Community Feature (full flow UI→Laravel→Daemon).
 * 
 * Covers: publish, unpublish, like, feed, trending, tags, profile, use asset.
 * Includes edge cases from BA plan.
 */
class CommunityFeatureTest extends TestCase
{
    use RefreshDatabase;

    private User $proUser;
    private User $freeUser;
    private User $studioUser;
    private Plan $freePlan;
    private Plan $proPlan;
    private Plan $studioPlan;

    protected function setUp(): void
    {
        parent::setUp();

        // Create plans
        $this->freePlan = Plan::create([
            'name' => 'Free', 'slug' => 'free',
            'max_concurrent_jobs' => 1, 'monthly_credits' => 100,
            'price_regular' => 0,
        ]);
        $this->proPlan = Plan::create([
            'name' => 'Pro', 'slug' => 'pro',
            'max_concurrent_jobs' => 3, 'monthly_credits' => 500,
            'price_regular' => 149000,
        ]);
        $this->studioPlan = Plan::create([
            'name' => 'Studio', 'slug' => 'studio',
            'max_concurrent_jobs' => 10, 'monthly_credits' => 2000,
            'price_regular' => 499000,
        ]);

        $this->freeUser = User::factory()->create([
            'plan_id' => $this->freePlan->id, 'credits' => 1000, 'username' => 'free_user',
        ]);
        $this->proUser = User::factory()->create([
            'plan_id' => $this->proPlan->id, 'credits' => 50000, 'username' => 'pro_user',
        ]);
        $this->studioUser = User::factory()->create([
            'plan_id' => $this->studioPlan->id, 'credits' => 100000, 'username' => 'studio_user',
        ]);

        config(['queue.default' => 'sync']);
        config(['broadcasting.default' => 'null']);

        // Seed CommunitySettings DB rows to avoid MissingSettings at runtime
        \Illuminate\Support\Facades\DB::table('settings')->insert([
            ['group' => 'community', 'name' => 'creator_payout_percent', 'payload' => json_encode(25)],
            ['group' => 'community', 'name' => 'like_weight', 'payload' => json_encode(2)],
            ['group' => 'community', 'name' => 'view_weight', 'payload' => json_encode(1)],
            ['group' => 'community', 'name' => 'trending_limit', 'payload' => json_encode(20)],
            ['group' => 'community', 'name' => 'top_creators_limit', 'payload' => json_encode(10)],
            ['group' => 'community', 'name' => 'pro_publish_limit', 'payload' => json_encode(5)],
            ['group' => 'community', 'name' => 'studio_publish_limit', 'payload' => json_encode(20)],
            ['group' => 'community', 'name' => 'rep_pub_weight', 'payload' => json_encode(10)],
            ['group' => 'community', 'name' => 'rep_like_weight', 'payload' => json_encode(2)],
            ['group' => 'community', 'name' => 'rep_usage_weight', 'payload' => json_encode(5)],
            ['group' => 'community', 'name' => 'rep_age_weight', 'payload' => json_encode(0.5)],
            ['group' => 'community', 'name' => 'rep_thresholds', 'payload' => json_encode([
                'newbie' => 0, 'creator' => 100, 'artist' => 500,
                'director' => 2000, 'producer' => 5000, 'legend' => 10000,
            ])],
        ]);
    }

    /** Create a completed render job for testing */
    private function createCompletedJob(User $user, int $creditsCost = 2000, array $attrs = []): RenderJob
    {
        return RenderJob::create(array_merge([
            'user_id' => $user->id,
            'status' => 'completed',
            'prompt' => 'A beautiful sunset over the ocean',
            'title' => 'Sunset Ocean',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
            'credits_cost' => $creditsCost,
            'output_path' => '/output/sunset.mp4',
            'thumbnail_path' => '/thumb/sunset.jpg',
            'completed_at' => now(),
        ], $attrs));
    }

    /** Save settings without MissingSettings error */
    private function saveSettings(array $overrides = []): void
    {
        foreach ($overrides as $key => $value) {
            \Illuminate\Support\Facades\DB::table('settings')
                ->where('group', 'community')
                ->where('name', $key)
                ->update(['payload' => json_encode($value)]);
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PUBLISH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function pro_user_can_publish_sharing(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
                'tags' => ['pub-test-landscape', 'pub-test-nature'],
            ]);

        $response->assertOk()->assertJsonPath('data.visibility', 'sharing');
        $this->assertEquals('sharing', $job->fresh()->visibility);
        $this->assertEquals(0, $job->fresh()->creator_payout);
        $this->assertNotNull($job->fresh()->published_at);
        $this->assertEquals(['pub-test-landscape', 'pub-test-nature'], $job->fresh()->tags);
    }

    /** @test */
    public function pro_user_can_publish_public_with_payout(): void
    {
        $this->saveSettings(['creator_payout_percent' => 25]);

        $job = $this->createCompletedJob($this->proUser, 2000);
        $balanceBefore = $this->proUser->credits;

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'public',
                'tags' => ['premium'],
            ]);

        $response->assertOk()->assertJsonPath('data.visibility', 'public');
        $fresh = $job->fresh();
        $this->assertEquals('public', $fresh->visibility);
        $this->assertEquals(500, $fresh->creator_payout); // 2000 * 25% = 500

        // Creator received credits
        $this->proUser->refresh();
        $this->assertEquals($balanceBefore + 500, $this->proUser->credits);
    }

    /** @test */
    public function free_user_cannot_publish(): void
    {
        $job = $this->createCompletedJob($this->freeUser);

        $response = $this->actingAs($this->freeUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ]);

        $response->assertStatus(403);
        $this->assertEquals('private', $job->fresh()->visibility);
    }

    /** @test */
    public function cannot_publish_uncompleted_asset(): void
    {
        $job = RenderJob::create([
            'user_id' => $this->proUser->id,
            'status' => 'queued',
            'prompt' => 'Test',
            'duration_seconds' => 5,
            'credits_cost' => 1000,
        ]);

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function cannot_publish_others_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $response = $this->actingAs($this->studioUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function publish_daily_limit_enforced(): void
    {
        $this->saveSettings(['pro_publish_limit' => 2]);

        // Publish 2 assets
        $job1 = $this->createCompletedJob($this->proUser);
        $job2 = $this->createCompletedJob($this->proUser);

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job1->uuid}/publish", ['visibility' => 'sharing'])
            ->assertOk();

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job2->uuid}/publish", ['visibility' => 'sharing'])
            ->assertOk();

        // 3rd should fail
        $job3 = $this->createCompletedJob($this->proUser);
        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job3->uuid}/publish", ['visibility' => 'sharing']);

        $response->assertStatus(429);
    }

    /** @test */
    public function tags_max_5_validated(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
                'tags' => ['a', 'b', 'c', 'd', 'e', 'f'],
            ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function studio_user_has_higher_publish_limit(): void
    {
        $this->saveSettings(['pro_publish_limit' => 1, 'studio_publish_limit' => 3]);

        // Studio user publishes 3 times
        for ($i = 0; $i < 3; $i++) {
            $job = $this->createCompletedJob($this->studioUser);
            $this->actingAs($this->studioUser, 'api')
                ->patchJson("/api/render-jobs/{$job->uuid}/publish", ['visibility' => 'sharing'])
                ->assertOk();
        }

        // 4th fails
        $job4 = $this->createCompletedJob($this->studioUser);
        $this->actingAs($this->studioUser, 'api')
            ->patchJson("/api/render-jobs/{$job4->uuid}/publish", ['visibility' => 'sharing'])
            ->assertStatus(429);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // IMAGE OUTPUT MODERATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** Create a completed image render job with a linked, fetchable image asset. */
    private function createImageJobWithAsset(User $user, array $attrs = []): RenderJob
    {
        $job = $this->createCompletedJob($user, 2000, array_merge([
            'video_type' => 'image_generation',
            'capability' => 't2i',
        ], $attrs));

        Asset::create([
            'user_id' => $user->id,
            'render_job_id' => $job->id,
            'type' => 'image',
            'mime_type' => 'image/png',
            'path' => "outputs/{$job->uuid}.png",
            'original_name' => 'out.png',
            'size_bytes' => 4096,
            // Pre-set external URL → daemonFetchableImageUrl() returns it directly,
            // no S3/MinIO disk config needed in the test env.
            'external_url' => "https://cdn.example.test/{$job->uuid}.png",
        ]);

        return $job->fresh();
    }

    /** @test */
    public function image_publish_blocked_when_moderation_unsafe(): void
    {
        $job = $this->createImageJobWithAsset($this->proUser);

        $this->mock(\App\Services\DaemonClient::class, function ($mock) {
            $mock->shouldReceive('moderateImage')->once()
                ->andReturn(['safe' => false, 'reason' => 'nudity']);
        });

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'public',
            ]);

        $response->assertStatus(422)->assertJsonPath('error', 'unsafe_image');
        $this->assertEquals('private', $job->fresh()->visibility);
        $this->assertNull($job->fresh()->published_at);
    }

    /** @test */
    public function image_publish_allowed_when_moderation_safe(): void
    {
        $job = $this->createImageJobWithAsset($this->proUser);

        $this->mock(\App\Services\DaemonClient::class, function ($mock) {
            $mock->shouldReceive('moderateImage')->once()
                ->andReturn(['safe' => true]);
        });

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ]);

        $response->assertOk()->assertJsonPath('data.visibility', 'sharing');
        $this->assertEquals('sharing', $job->fresh()->visibility);
    }

    /** @test */
    public function image_publish_held_for_review_when_moderation_degraded(): void
    {
        // A degraded verdict (vision provider errored/unconfigured) must NOT silently pass as
        // safe. The asset is published but held out of the public feed for manual review, and
        // the creator payout is deferred until an admin approves it.
        $this->saveSettings(['creator_payout_percent' => 25]);
        $job = $this->createImageJobWithAsset($this->proUser);
        $balanceBefore = $this->proUser->credits;

        $this->mock(\App\Services\DaemonClient::class, function ($mock) {
            $mock->shouldReceive('moderateImage')->once()
                ->andReturn(['safe' => true, 'degraded' => true]);
        });

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'public',
            ]);

        $response->assertOk()
            ->assertJsonPath('pending_review', true)
            ->assertJsonPath('data.moderation_status', RenderJob::MODERATION_PENDING);

        $fresh = $job->fresh();
        $this->assertEquals(RenderJob::MODERATION_PENDING, $fresh->moderation_status);
        $this->assertEquals(0, $fresh->creator_payout, 'payout deferred until approval');

        $this->proUser->refresh();
        $this->assertEquals($balanceBefore, $this->proUser->credits);

        // Held asset stays out of the public feed.
        $feed = $this->getJson('/api/v1/community/assets')->assertOk()->json('data.items');
        $this->assertNotContains($job->uuid, array_column($feed, 'uuid'));
    }

    /** @test */
    public function approving_a_held_public_asset_releases_it_and_grants_deferred_payout(): void
    {
        $this->saveSettings(['creator_payout_percent' => 25]);
        $job = $this->createCompletedJob($this->proUser, 2000);
        $balanceBefore = $this->proUser->credits;

        // Simulate the held-publish path (degraded verdict).
        $job->publish('public', [], RenderJob::MODERATION_PENDING);
        $this->proUser->refresh();
        $this->assertEquals($balanceBefore, $this->proUser->credits, 'no payout while held');

        $job->approveModeration();

        $fresh = $job->fresh();
        $this->assertEquals(RenderJob::MODERATION_APPROVED, $fresh->moderation_status);
        $this->assertEquals(500, $fresh->creator_payout); // 2000 * 25%
        $this->proUser->refresh();
        $this->assertEquals($balanceBefore + 500, $this->proUser->credits);

        // Now visible in the public feed.
        $feed = $this->getJson('/api/v1/community/assets')->assertOk()->json('data.items');
        $this->assertContains($job->uuid, array_column($feed, 'uuid'));
    }

    /** @test */
    public function rejecting_a_held_asset_hides_it_and_pays_nothing(): void
    {
        $this->saveSettings(['creator_payout_percent' => 25]);
        $job = $this->createCompletedJob($this->proUser, 2000);
        $balanceBefore = $this->proUser->credits;

        $job->publish('public', [], RenderJob::MODERATION_PENDING);
        $job->rejectModeration();

        $fresh = $job->fresh();
        $this->assertEquals(RenderJob::MODERATION_REJECTED, $fresh->moderation_status);
        $this->proUser->refresh();
        $this->assertEquals($balanceBefore, $this->proUser->credits);

        $feed = $this->getJson('/api/v1/community/assets')->assertOk()->json('data.items');
        $this->assertNotContains($job->uuid, array_column($feed, 'uuid'));
    }

    /** @test */
    public function video_publish_skips_image_moderation(): void
    {
        // A plain video job (default) must not trigger the image moderator at all.
        $job = $this->createCompletedJob($this->proUser);

        $this->mock(\App\Services\DaemonClient::class, function ($mock) {
            $mock->shouldNotReceive('moderateImage');
        });

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ])
            ->assertOk();
    }

    /** @test */
    public function image_publish_skips_moderation_when_disabled(): void
    {
        config(['services.daemon.image_moderation_enabled' => false]);

        $job = $this->createImageJobWithAsset($this->proUser);

        $this->mock(\App\Services\DaemonClient::class, function ($mock) {
            $mock->shouldNotReceive('moderateImage');
        });

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
            ])
            ->assertOk();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UNPUBLISH
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function user_can_unpublish_own_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/unpublish");

        $response->assertOk();
        $this->assertEquals('private', $job->fresh()->visibility);
        $this->assertNull($job->fresh()->published_at);
    }

    /** @test */
    public function cannot_unpublish_others_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $response = $this->actingAs($this->freeUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/unpublish");

        $response->assertStatus(403);
        $this->assertEquals('sharing', $job->fresh()->visibility);
    }

    /** @test */
    public function cannot_publish_already_published_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $response = $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'public'
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('error', 'Asset đã được đăng lên cộng đồng');
    }

    /** @test */
    public function comment_daily_limit_enforced(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        // Post 50 comments (since the limit is 50)
        for ($i = 0; $i < 50; $i++) {
            \App\Models\Comment::create([
                'user_id' => $this->proUser->id,
                'render_job_id' => $job->id,
                'content' => "Comment {$i}"
            ]);
        }

        // The 51st comment should fail
        $response = $this->actingAs($this->proUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/comments", [
                'content' => 'This is comment 51'
            ]);

        $response->assertStatus(429);
        $response->assertJsonPath('error', 'Bạn đã đạt giới hạn 50 bình luận hôm nay');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // LIKE / UNLIKE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function user_can_like_and_unlike_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        // Like
        $res = $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like");
        $res->assertOk()->assertJsonPath('data.liked', true)->assertJsonPath('data.count', 1);

        $this->assertDatabaseHas('likes', [
            'user_id' => $this->freeUser->id,
            'render_job_id' => $job->id,
        ]);

        // Unlike (toggle)
        $res = $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like");
        $res->assertOk()->assertJsonPath('data.liked', false)->assertJsonPath('data.count', 0);

        $this->assertDatabaseMissing('likes', [
            'user_id' => $this->freeUser->id,
            'render_job_id' => $job->id,
        ]);
    }

    /** @test */
    public function multiple_users_can_like_same_asset(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $otherUser = User::factory()->create(['plan_id' => $this->freePlan->id, 'credits' => 500]);

        $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like")
            ->assertJsonPath('data.count', 1);

        $this->actingAs($otherUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like")
            ->assertJsonPath('data.count', 2);

        $this->assertEquals(2, Like::where('render_job_id', $job->id)->count());
    }

    /** @test */
    public function cannot_like_uncompleted_asset(): void
    {
        $job = RenderJob::create([
            'user_id' => $this->proUser->id,
            'status' => 'processing',
            'prompt' => 'Test',
            'duration_seconds' => 5,
        ]);

        $response = $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like");

        $response->assertStatus(422);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // COMMUNITY FEED
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function feed_shows_published_assets(): void
    {
        $job1 = $this->createCompletedJob($this->proUser, 2000, ['tags' => '["anime"]']);
        $job2 = $this->createCompletedJob($this->studioUser, 3000, ['tags' => '["cyberpunk"]']);

        // Publish both
        $job1->publish('sharing');
        $job2->publish('public');

        // Create a private job that should NOT appear
        $this->createCompletedJob($this->proUser, 1000);

        $response = $this->getJson('/api/v1/community/assets');

        $response->assertOk();
        $items = $response->json('data.items');
        $this->assertCount(2, $items);
    }

    /** @test */
    public function feed_supports_search(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000, ['prompt' => 'A neon cyberpunk city at night']);
        $job->publish('sharing');

        // Search by prompt
        $res = $this->getJson('/api/v1/community/assets?q=cyberpunk');
        $res->assertOk();
        $this->assertCount(1, $res->json('data.items'));

        // No match
        $res = $this->getJson('/api/v1/community/assets?q=dinosaur');
        $res->assertOk();
        $this->assertCount(0, $res->json('data.items'));
    }

    /** @test */
    public function feed_supports_tag_filter(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000, ['tags' => '["anime","cinematic"]']);
        $job->publish('sharing', ['anime', 'cinematic']);

        $res = $this->getJson('/api/v1/community/assets?tag=anime');
        $res->assertOk();
        $this->assertCount(1, $res->json('data.items'));

        $res = $this->getJson('/api/v1/community/assets?tag=nonexistent');
        $res->assertOk();
        $this->assertCount(0, $res->json('data.items'));
    }

    /** @test */
    public function feed_supports_sort(): void
    {
        $job1 = $this->createCompletedJob($this->proUser, 2000);
        $job2 = $this->createCompletedJob($this->proUser, 3000);
        $job1->publish('sharing');
        $job2->publish('sharing');

        // Like job2 more → should appear first when sort=popular
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job2->id]);

        $res = $this->getJson('/api/v1/community/assets?sort=popular');
        $items = $res->json('data.items');
        $this->assertEquals($job2->uuid, $items[0]['uuid']);
    }

    /** @test */
    public function feed_is_paginated(): void
    {
        for ($i = 0; $i < 25; $i++) {
            $job = $this->createCompletedJob($this->proUser, 2000);
            $job->publish('sharing');
        }

        $res = $this->getJson('/api/v1/community/assets?page=1');
        $res->assertOk();
        $this->assertCount(20, $res->json('data.items'));
        $this->assertEquals(25, $res->json('data.total'));
        $this->assertEquals(2, $res->json('data.last_page'));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TRENDING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function trending_returns_assets_ordered_by_score(): void
    {
        $job1 = $this->createCompletedJob($this->proUser, 2000);
        $job2 = $this->createCompletedJob($this->proUser, 2000);
        $job1->publish('sharing');
        $job2->publish('public');

        // Like job2 more
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job2->id]);
        Like::create(['user_id' => $this->studioUser->id, 'render_job_id' => $job2->id]);

        // Warm cache
        Cache::flush();

        $res = $this->getJson('/api/v1/trending?period=week');
        $res->assertOk();
        $items = $res->json('data');
        $this->assertGreaterThanOrEqual(2, count($items));
        $this->assertEquals($job2->uuid, $items[0]['uuid']); // more likes → higher score
    }

    /** @test */
    public function trending_returns_creators(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000);
        $job->publish('sharing');

        Cache::flush();

        $res = $this->getJson('/api/v1/trending/creators?period=month');
        $res->assertOk();
        $creators = $res->json('data');
        $this->assertNotEmpty($creators);
        $this->assertEquals('pro_user', $creators[0]['username']);
    }

    /** @test */
    public function trending_respects_period_filter(): void
    {
        $oldJob = $this->createCompletedJob($this->proUser, 2000, ['published_at' => now()->subDays(60)]);
        $oldJob->update(['visibility' => 'sharing', 'published_at' => now()->subDays(60)]);

        Cache::flush();

        // Month should include 60-day-old asset
        $res = $this->getJson('/api/v1/trending?period=month');
        // Day should NOT include 60-day-old asset
        $resDay = $this->getJson('/api/v1/trending?period=day');
        $this->assertCount(0, $resDay->json('data'));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // USER PROFILE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function user_profile_shows_stats(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000);
        $job->publish('sharing');
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job->id]);

        $res = $this->getJson("/api/v1/users/pro_user");
        $res->assertOk()
            ->assertJsonPath('data.username', 'pro_user')
            ->assertJsonPath('data.stats.published_count', 1)
            ->assertJsonPath('data.stats.likes_received', 1)
            ->assertJsonPath('data.reputation_level', 'newbie');
    }

    /** @test */
    public function user_profile_returns_404_for_unknown_user(): void
    {
        $this->getJson('/api/v1/users/nonexistent_user')
            ->assertStatus(404);
    }

    /** @test */
    public function user_assets_shows_only_published(): void
    {
        $published = $this->createCompletedJob($this->proUser, 2000);
        $published->publish('sharing');

        $private = $this->createCompletedJob($this->proUser, 1000); // stays private

        $res = $this->getJson('/api/v1/users/pro_user/assets');
        $res->assertOk();
        $items = $res->json('data.items');
        $this->assertCount(1, $items);
        $this->assertEquals($published->uuid, $items[0]['uuid']);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // USE ASSET
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function use_asset_increments_usage_count(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $this->assertEquals(0, $job->fresh()->usage_count);

        $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/use")
            ->assertOk();

        $this->assertEquals(1, $job->fresh()->usage_count);
    }

    /** @test */
    public function self_usage_does_not_increment(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $this->actingAs($this->proUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/use")
            ->assertOk();

        $this->assertEquals(0, $job->fresh()->usage_count);
    }

    /** @test */
    public function use_asset_debounce_per_ip(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        // First call increments
        $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/use")
            ->assertOk();
        $this->assertEquals(1, $job->fresh()->usage_count);

        // Second call within 30s from same IP should NOT increment
        $this->actingAs($this->freeUser, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/use")
            ->assertOk();
        $this->assertEquals(1, $job->fresh()->usage_count); // still 1
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAGS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function tags_api_returns_popular_tags(): void
    {
        Tag::create(['slug' => 'anime', 'label_vi' => 'Anime', 'usage_count' => 100]);
        Tag::create(['slug' => 'cyberpunk', 'label_vi' => 'Cyberpunk', 'usage_count' => 50]);
        Tag::create(['slug' => 'nature', 'label_vi' => 'Nature', 'usage_count' => 10]);

        $res = $this->getJson('/api/tags');
        $res->assertOk();
        $tags = $res->json('data');
        $this->assertCount(3, $tags);
        $this->assertEquals('anime', $tags[0]['slug']); // most popular first
    }

    /** @test */
    public function tags_searchable(): void
    {
        Tag::create(['slug' => 'anime-style', 'label_vi' => 'Anime Style', 'usage_count' => 10]);
        Tag::create(['slug' => 'cyberpunk', 'label_vi' => 'Cyberpunk', 'usage_count' => 10]);

        $res = $this->getJson('/api/tags?q=anime');
        $res->assertOk();
        $this->assertCount(1, $res->json('data'));
    }

    /** @test */
    public function tag_assets_returns_filtered_results(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000, ['tags' => '["anime"]']);
        $job->publish('sharing', ['anime']);

        // Tag already created by publish(), no need to create separately

        $res = $this->getJson('/api/v1/tags/anime/assets');
        $res->assertOk();
        $this->assertGreaterThanOrEqual(1, count($res->json('data.items')));
    }

    /** @test */
    public function tag_assets_returns_404_for_unknown_tag(): void
    {
        $this->getJson('/api/v1/tags/nonexistent/assets')
            ->assertStatus(404);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // USER LIKES LIST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function user_likes_shows_liked_assets(): void
    {
        $job1 = $this->createCompletedJob($this->proUser);
        $job1->publish('sharing');

        $job2 = $this->createCompletedJob($this->studioUser);
        $job2->publish('sharing');

        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job1->id]);
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job2->id]);

        $res = $this->actingAs($this->freeUser, 'api')
            ->getJson('/api/users/likes');

        $res->assertOk();
        $items = $res->json('data.items');
        $this->assertCount(2, $items);
    }

    /** @test */
    public function user_likes_ordered_by_like_date(): void
    {
        $job1 = $this->createCompletedJob($this->proUser);
        $job1->publish('sharing');

        $job2 = $this->createCompletedJob($this->proUser);
        $job2->publish('sharing');

        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job1->id]);
        // MySQL timestamp has second precision, so sleep to ensure different timestamps
        sleep(1);
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job2->id]);

        $res = $this->actingAs($this->freeUser, 'api')
            ->getJson('/api/users/likes');

        $res->assertOk();
        $items = $res->json('data.items');
        $this->assertCount(2, $items);
        $this->assertEquals($job2->uuid, $items[0]['uuid']); // most recent first
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ASSET CARD FORMAT (security: no sensitive fields)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function asset_card_does_not_expose_model_or_provider(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000, [
            'model' => 'qwen-image-plus',
            'capability' => 't2i',
        ]);
        $job->publish('sharing');

        $res = $this->getJson('/api/v1/community/assets');
        $item = $res->json('data.items.0');
        $this->assertArrayNotHasKey('model', $item);
        $this->assertArrayNotHasKey('provider', $item);
        // Note: `capability` (t2i/i2v/r2v) is a non-sensitive generation-mode
        // hint — it does not reveal the AI model/vendor — and the frontend
        // remix-modal relies on it to render a human-friendly project label.
        // It is intentionally exposed; only model/provider are withheld.
    }

    /** @test */
    public function asset_card_includes_required_fields(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2500, [
            'prompt' => 'Cyberpunk city at dawn',
            'title' => 'Neon Dawn',
            'output_path' => '/output/cyberpunk.mp4',
            'thumbnail_path' => '/thumb/cyberpunk.jpg',
            'resolution' => '1080p',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
        ]);
        $job->publish('public', ['cyberpunk', 'neon']);

        $res = $this->getJson('/api/v1/community/assets');
        $item = $res->json('data.items.0');

        $this->assertEquals($job->uuid, $item['uuid']);
        $this->assertEquals('Neon Dawn', $item['title']);
        $this->assertEquals('Cyberpunk city at dawn', $item['prompt']);
        $this->assertEquals('/output/cyberpunk.mp4', $item['output_path']);
        $this->assertEquals('/thumb/cyberpunk.jpg', $item['thumbnail_path']);
        $this->assertEquals('16:9', $item['aspect_ratio']);
        $this->assertEquals('1080p', $item['resolution']);
        $this->assertEquals(5, $item['duration_seconds']);
        $this->assertEquals(2500, $item['credits_cost']);
        $this->assertEquals('public', $item['visibility']);
        $this->assertEquals(['cyberpunk', 'neon'], $item['tags']);
        $this->assertEquals(0, $item['like_count']);
        $this->assertEquals(0, $item['usage_count']);
        $this->assertEquals('pro_user', $item['user']['username']);
        $this->assertEquals('video', $item['asset_type']);
    }

    /** @test */
    public function asset_card_returns_correct_asset_type_for_images(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2500, [
            'prompt' => 'Cyberpunk city at dawn image',
            'video_type' => 'image_generation',
            'duration_seconds' => 5, // Image with >0 duration
        ]);
        $job->publish('public');

        $res = $this->getJson('/api/v1/community/assets');
        $item = $res->json('data.items.0');

        $this->assertEquals('image', $item['asset_type']);
    }

    /** @test */
    public function asset_card_resolves_reference_images_via_batched_lookup(): void
    {
        // Two reference images, stored as Assets, referenced by path on the job.
        $ref1 = Asset::create([
            'user_id' => $this->proUser->id,
            'type' => 'image',
            'mime_type' => 'image/png',
            'path' => 'refs/ref-one.png',
            'original_name' => 'ref-one.png',
            'size_bytes' => 1234,
        ]);
        $ref2 = Asset::create([
            'user_id' => $this->proUser->id,
            'type' => 'image',
            'mime_type' => 'image/png',
            'path' => 'refs/ref-two.png',
            'original_name' => 'ref-two.png',
            'size_bytes' => 5678,
        ]);

        $job = $this->createCompletedJob($this->proUser, 2500, [
            'video_type' => 'image_editing',
            'reference_images' => ['refs/ref-one.png', 'refs/ref-two.png', 'refs/missing.png'],
        ]);
        $job->publish('public');

        $res = $this->getJson('/api/v1/community/assets')->assertOk();
        $item = $res->json('data.items.0');

        // Known paths resolve to the Asset URL; unknown path falls back to the raw path.
        $this->assertCount(3, $item['reference_images']);
        $this->assertEquals($ref1->url, $item['reference_images'][0]);
        $this->assertEquals($ref2->url, $item['reference_images'][1]);
        $this->assertEquals('refs/missing.png', $item['reference_images'][2]);
    }

    /** @test */
    public function feed_query_count_is_constant_regardless_of_card_count(): void
    {
        // Seed several published cards, each with a reference image, to catch N+1.
        for ($i = 0; $i < 5; $i++) {
            Asset::create([
                'user_id' => $this->proUser->id,
                'type' => 'image',
                'mime_type' => 'image/png',
                'path' => "refs/card-{$i}.png",
                'original_name' => "card-{$i}.png",
                'size_bytes' => 100,
            ]);
            $job = $this->createCompletedJob($this->proUser, 2000, [
                'video_type' => 'image_editing',
                'reference_images' => ["refs/card-{$i}.png"],
            ]);
            $job->publish('public');
        }

        // Warm request-scoped caches (e.g. the IP-whitelist cache in ThrottleApiRequests)
        // so BOTH measured requests are in steady state — otherwise the first request pays a
        // one-time cache-miss DB query and the two counts differ spuriously (not an N+1).
        $this->getJson('/api/v1/community/assets')->assertOk();

        // Measure ONLY the feed request (creation queries excluded).
        \Illuminate\Support\Facades\DB::flushQueryLog();
        \Illuminate\Support\Facades\DB::enableQueryLog();
        $this->getJson('/api/v1/community/assets')->assertOk();
        $countMany = count(\Illuminate\Support\Facades\DB::getQueryLog());
        \Illuminate\Support\Facades\DB::disableQueryLog();

        // Add 5 more cards; query count must not scale with the number of cards.
        for ($i = 5; $i < 10; $i++) {
            Asset::create([
                'user_id' => $this->proUser->id,
                'type' => 'image',
                'mime_type' => 'image/png',
                'path' => "refs/card-{$i}.png",
                'original_name' => "card-{$i}.png",
                'size_bytes' => 100,
            ]);
            $job = $this->createCompletedJob($this->proUser, 2000, [
                'video_type' => 'image_editing',
                'reference_images' => ["refs/card-{$i}.png"],
            ]);
            $job->publish('public');
        }

        \Illuminate\Support\Facades\DB::flushQueryLog();
        \Illuminate\Support\Facades\DB::enableQueryLog();
        $this->getJson('/api/v1/community/assets')->assertOk();
        $countMore = count(\Illuminate\Support\Facades\DB::getQueryLog());
        \Illuminate\Support\Facades\DB::disableQueryLog();

        // Constant query count (batched reference-image + eager-loaded assets, no N+1).
        $this->assertEquals($countMany, $countMore, 'Feed query count must not grow with card count (N+1)');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // REPUTATION COMMAND
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function reputation_command_scores_users(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');
        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job->id]);

        $this->artisan('reputation:compute')->assertSuccessful();

        $this->proUser->refresh();
        $this->assertGreaterThan(0, $this->proUser->reputation_score);
        $this->assertNotNull($this->proUser->reputation_level);
    }

    /** @test */
    public function reputation_levels_match_thresholds(): void
    {
        $this->saveSettings([
            'rep_pub_weight' => 100,
            'rep_like_weight' => 10,
            'rep_usage_weight' => 5,
            'rep_age_weight' => 0,
            'rep_thresholds' => [
                'newbie' => 0, 'creator' => 50, 'artist' => 200, 'director' => 500,
                'producer' => 1000, 'legend' => 2000,
            ],
        ]);

        // 1 publish = 100 points → "creator" level
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $this->artisan('reputation:compute')->assertSuccessful();
        $this->proUser->refresh();
        $this->assertEquals('creator', $this->proUser->reputation_level);
        $this->assertGreaterThanOrEqual(100, $this->proUser->reputation_score);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TRENDING COMPUTE COMMAND
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function trending_compute_caches_all_periods(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        $this->artisan('trending:compute')->assertSuccessful();

        $this->assertTrue(Cache::has('trending:assets:day'));
        $this->assertTrue(Cache::has('trending:assets:week'));
        $this->assertTrue(Cache::has('trending:assets:month'));
        $this->assertTrue(Cache::has('trending:creators:day'));
        $this->assertTrue(Cache::has('trending:creators:week'));
        $this->assertTrue(Cache::has('trending:creators:month'));
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TAGS COMPUTE COMMAND
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function tags_update_counts_command(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000, ['tags' => '["unique-tag-xyz"]']);
        $job->publish('sharing', ['unique-tag-xyz']);

        $this->artisan('tags:update-counts')->assertSuccessful();

        $tag = Tag::where('slug', 'unique-tag-xyz')->first();
        $this->assertNotNull($tag);
        $this->assertEquals(1, $tag->usage_count);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EDGE CASES
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    /** @test */
    public function publish_enforces_username_uniqueness_via_api(): void
    {
        // Create a user without username
        $newUser = User::factory()->create(['plan_id' => $this->freePlan->id, 'credits' => 1000]);
        // free_user already taken
        $this->actingAs($newUser, 'api')
            ->putJson("/api/users/{$newUser->uuid}", [
                'username' => 'free_user', // already taken
            ])
            ->assertStatus(422);

        // Valid username should work
        $this->actingAs($newUser, 'api')
            ->putJson("/api/users/{$newUser->uuid}", [
                'username' => 'unique_user_999',
            ])
            ->assertOk();
    }

    /** @test */
    public function feed_excludes_failed_jobs(): void
    {
        $job = $this->createCompletedJob($this->proUser, 2000);
        $job->update(['status' => 'failed']);
        $job->update(['visibility' => 'sharing', 'published_at' => now()]);

        $res = $this->getJson('/api/v1/community/assets');
        $this->assertCount(0, $res->json('data.items'));
    }

    /** @test */
    public function feed_excludes_non_published(): void
    {
        $this->createCompletedJob($this->proUser);
        // Not published — stays private

        $res = $this->getJson('/api/v1/community/assets');
        $this->assertCount(0, $res->json('data.items'));
    }

    /** @test */
    public function publish_validates_visibility_enum(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'invalid_option',
            ])
            ->assertStatus(422);
    }

    /** @test */
    public function admin_payout_percent_zero_gives_no_payout(): void
    {
        $this->saveSettings(['creator_payout_percent' => 0]);

        $job = $this->createCompletedJob($this->proUser, 2000);
        $balanceBefore = $this->proUser->credits;

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'public',
            ])
            ->assertOk();

        $this->assertEquals(0, $job->fresh()->creator_payout);
        $this->proUser->refresh();
        $this->assertEquals($balanceBefore, $this->proUser->credits);
    }

    /** @test */
    public function like_count_reflects_in_asset_card(): void
    {
        $job = $this->createCompletedJob($this->proUser);
        $job->publish('sharing');

        Like::create(['user_id' => $this->freeUser->id, 'render_job_id' => $job->id]);
        Like::create(['user_id' => $this->studioUser->id, 'render_job_id' => $job->id]);

        $res = $this->getJson('/api/v1/community/assets');
        $item = $res->json('data.items.0');
        $this->assertEquals(2, $item['like_count']);
    }

    /** @test */
    public function format_asset_card_handles_null_user(): void
    {
        // When a user is soft-deleted/deactivated, their render jobs should still show
        // but with no user data. This is a future-proof test. For now, skip null user test
        // since FK is NO ACTION — user deletion prevents by design.
        $this->markTestSkipped('User FK is NO ACTION — deleting users with jobs is prevented at DB level');
    }

    /** @test */
    public function publish_creates_tag_records(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $this->actingAs($this->proUser, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", [
                'visibility' => 'sharing',
                'tags' => ['publish-test-tag-1', 'publish-test-tag-2'],
            ])
            ->assertOk();

        $this->assertDatabaseHas('tags', ['slug' => 'publish-test-tag-1']);
        $this->assertDatabaseHas('tags', ['slug' => 'publish-test-tag-2']);
    }

    /** @test */
    public function community_routes_require_auth_for_write_ops(): void
    {
        $job = $this->createCompletedJob($this->proUser);

        $this->patchJson("/api/render-jobs/{$job->uuid}/publish", ['visibility' => 'sharing'])
            ->assertStatus(401);

        $this->postJson("/api/render-jobs/{$job->uuid}/like")
            ->assertStatus(401);

        $this->postJson("/api/render-jobs/{$job->uuid}/use")
            ->assertStatus(401);
    }

    /** @test */
    public function community_read_routes_are_public(): void
    {
        $this->getJson('/api/v1/community/assets')->assertOk();
        $this->getJson('/api/v1/trending?period=week')->assertOk();
        $this->getJson('/api/tags')->assertOk();
    }
}
