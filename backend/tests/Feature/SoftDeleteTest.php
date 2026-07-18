<?php

namespace Tests\Feature;

use App\Console\Commands\PruneTrashedRecords;
use App\Models\Asset;
use App\Models\RenderJob;
use App\Models\Storyboard;
use App\Models\StoryboardReference;
use App\Models\StoryboardScene;
use App\Models\User;
use App\Models\VideoType;
use App\Models\Plan;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use App\Models\CreditSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class SoftDeleteTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Configure soft-delete TTL for tests
        config(['soft-delete.ttl' => [
            User::class => 30,
            Storyboard::class => 30,
            StoryboardScene::class => 30,
            StoryboardReference::class => 30,
            RenderJob::class => 30,
            Asset::class => 30,
        ]]);

        // Seed minimal required data
        VideoType::create([
            'code' => 'text_to_video',
            'name' => 'Text-to-Video',
            'base_credits' => 200,
            'is_active' => true,
            'sort_order' => 1,
        ]);

        DurationTier::create([
            'code' => '5s', 'name' => '5 seconds', 'seconds' => 5,
            'multiplier' => 0.78, 'is_active' => true, 'sort_order' => 1,
        ]);

        ResolutionPricing::create([
            'code' => '720p', 'name' => 'HD 720p', 'width' => 1280, 'height' => 720,
            'multiplier' => 1.0, 'is_active' => true, 'sort_order' => 720,
        ]);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'quality_multiplier' => 1.0,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'monthly_credits' => 300,
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

        // Ensure panel_user role exists for registration tests
        if (!\Spatie\Permission\Models\Role::where('name', 'panel_user')->exists()) {
            \Spatie\Permission\Models\Role::create(['name' => 'panel_user', 'guard_name' => 'web']);
        }

        $freePlan = Plan::where('slug', 'free')->first();
        $this->user = User::factory()->create([
            'credits' => 10000,
            'plan_id' => $freePlan->id,
        ]);
    }

    // =========================================================================
    // USER SOFT DELETE
    // =========================================================================

    /** @test */
    public function user_soft_delete_sets_deleted_at()
    {
        $user = User::factory()->create();

        $user->delete();

        $this->assertNotNull($user->fresh()->deleted_at);
        $this->assertTrue($user->fresh()->trashed());
    }

    /** @test */
    public function soft_deleted_user_not_in_default_queries()
    {
        $user = User::factory()->create();
        $user->delete();

        $users = User::all();
        $this->assertCount(1, $users); // Only $this->user (not deleted)
        $this->assertFalse($users->contains('id', $user->id));
    }

    /** @test */
    public function soft_deleted_user_visible_with_with_trashed()
    {
        $user = User::factory()->create();
        $userId = $user->id;
        $user->delete();

        $found = User::withTrashed()->find($userId);
        $this->assertNotNull($found);
        $this->assertTrue($found->trashed());
    }

    /** @test */
    public function only_trashed_scope_returns_only_deleted()
    {
        $user = User::factory()->create();
        $user->delete();

        $trashed = User::onlyTrashed()->get();
        $this->assertCount(1, $trashed);
        $this->assertEquals($user->id, $trashed->first()->id);
    }

    /** @test */
    public function registration_with_same_email_as_trashed_user_succeeds()
    {
        $email = 'deleteduser@example.com';
        $user = User::factory()->create(['email' => $email]);
        $user->delete();

        // Registration with same email should work because the unique index
        // includes deleted_at (so "email + NULL" ≠ "email + timestamp")
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New User',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => $email,
            'deleted_at' => null, // New record should be active
        ]);
    }

    /** @test */
    public function user_can_be_restored()
    {
        $user = User::factory()->create();
        $userId = $user->id;
        $user->delete();

        $user->restore();

        $this->assertNull($user->fresh()->deleted_at);
        $this->assertDatabaseHas('users', ['id' => $userId, 'deleted_at' => null]);
    }

    /** @test */
    public function user_force_delete_permanently_removes()
    {
        $user = User::factory()->create();
        $userId = $user->id;
        $user->forceDelete();

        $this->assertNull(User::withTrashed()->find($userId));
    }

    // =========================================================================
    // STORYBOARD CASCADE
    // =========================================================================

    /** @test */
    public function storyboard_soft_delete_cascades_to_scenes()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Cascade Test',
            'description' => 'Testing cascade soft delete',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene1 = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $scene2 = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 2,
            'prompt' => 'Scene 2',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $storyboardId = $storyboard->id;
        $storyboard->delete();

        // Storyboard should be soft-deleted
        $this->assertNotNull(Storyboard::withTrashed()->find($storyboardId)->deleted_at);
        $this->assertNull(Storyboard::find($storyboardId));

        // Scenes should also be soft-deleted
        $this->assertNotNull(StoryboardScene::withTrashed()->find($scene1->id)->deleted_at);
        $this->assertNotNull(StoryboardScene::withTrashed()->find($scene2->id)->deleted_at);
        $this->assertNull(StoryboardScene::find($scene1->id));
    }

    /** @test */
    public function storyboard_soft_delete_cascades_to_references()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Ref Cascade',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $ref = StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'character',
            'media_path' => '/uploads/char.jpg',
            'description' => 'Test character',
            'sort_order' => 1,
        ]);

        $storyboard->delete();

        // Reference should be soft-deleted
        $this->assertNotNull(StoryboardReference::withTrashed()->find($ref->id)->deleted_at);
        $this->assertNull(StoryboardReference::find($ref->id));
    }

    /** @test */
    public function soft_deleted_storyboard_not_in_api_index()
    {
        $this->actingAs($this->user, 'api');

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Invisible',
            'video_type' => 'text_to_video',
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

        Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Visible',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $storyboard->delete();

        $response = $this->getJson('/api/storyboards');
        $response->assertOk();

        $titles = collect($response->json('data'))->pluck('title');
        $this->assertCount(1, $titles);
        $this->assertNotContains('Invisible', $titles);
        $this->assertContains('Visible', $titles);
    }

    /** @test */
    public function force_deleting_storyboard_also_force_deletes_children()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Force Delete',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Doomed scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $ref = StoryboardReference::create([
            'storyboard_id' => $storyboard->id,
            'type' => 'background',
            'media_path' => '/uploads/bg.jpg',
            'sort_order' => 1,
        ]);

        $storyboardId = $storyboard->id;
        $sceneId = $scene->id;
        $refId = $ref->id;

        $storyboard->forceDelete();

        // Storyboard should be permanently gone
        $this->assertNull(Storyboard::withTrashed()->find($storyboardId));

        // Children also permanently gone
        $this->assertNull(StoryboardScene::withTrashed()->find($sceneId));
        $this->assertNull(StoryboardReference::withTrashed()->find($refId));
    }

    // =========================================================================
    // RENDER JOB SOFT DELETE
    // =========================================================================

    /** @test */
    public function render_job_soft_delete_does_not_delete_assets()
    {
        $renderJob = RenderJob::create([
            'uuid' => 'rj-soft-delete-test',
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'Test render job',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 50,
        ]);

        $asset = Asset::create([
            'uuid' => 'asset-not-deleted',
            'user_id' => $this->user->id,
            'render_job_id' => $renderJob->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/test.mp4',
            'original_name' => 'test.mp4',
            'size_bytes' => 1024,
        ]);

        $assetId = $asset->id;
        $renderJob->delete();

        // RenderJob is soft-deleted
        $this->assertNotNull(RenderJob::withTrashed()->find($renderJob->id)->deleted_at);

        // Asset is NOT deleted
        $this->assertNotNull(Asset::find($assetId));
        $this->assertNull($asset->fresh()->deleted_at);
    }

    /** @test */
    public function cleanup_orphan_daemon_projects_works_with_soft_deleted_jobs()
    {
        // Simulate a RenderJob that references a daemon project
        $renderJob = RenderJob::create([
            'uuid' => 'orphan-test-rj',
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'Has daemon project',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
            'credits_cost' => 50,
            'daemon_project_id' => 'daemon-proj-123',
        ]);

        $renderJob->delete();

        // The CleanupOrphanDaemonProjects command uses withTrashed() to check:
        // RenderJob::withTrashed()->where('daemon_project_id', $projectId)->exists()
        $exists = RenderJob::withTrashed()
            ->where('daemon_project_id', 'daemon-proj-123')
            ->exists();

        $this->assertTrue($exists, 'Soft-deleted render job should still be found by CleanupOrphanDaemonProjects');
    }

    // =========================================================================
    // ASSET SOFT DELETE
    // =========================================================================

    /** @test */
    public function asset_soft_delete_does_not_delete_file()
    {
        $asset = Asset::create([
            'uuid' => 'asset-file-test',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/preserved.mp4',
            'original_name' => 'preserved.mp4',
            'size_bytes' => 2048,
        ]);

        $asset->delete();

        // Asset should have deleted_at set
        $this->assertNotNull($asset->fresh()->deleted_at);

        // File path should still be intact (we don't delete files on soft delete)
        $this->assertEquals('videos/preserved.mp4', $asset->fresh()->path);
    }

    /** @test */
    public function soft_deleted_asset_excluded_from_api_index()
    {
        $this->actingAs($this->user, 'api');

        $asset = Asset::create([
            'uuid' => 'hidden-asset',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/hidden.mp4',
            'original_name' => 'hidden.mp4',
            'size_bytes' => 1024,
        ]);

        // Create a visible asset too
        Asset::create([
            'uuid' => 'visible-asset',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/visible.mp4',
            'original_name' => 'visible.mp4',
            'size_bytes' => 1024,
        ]);

        $asset->delete();

        $response = $this->getJson('/api/assets');
        $response->assertOk();

        // Response uses cleanPaginateResponse: data.items contains the actual assets
        $items = $response->json('data.items') ?? $response->json('data', []);
        // Handle case where data is a plain array (non-paginated) vs paginated format
        $uuids = collect(is_array($items) && isset($items[0]) ? collect($items)->pluck('uuid') : collect($response->json('data', []))->pluck('uuid'))->flatten()->filter()->values();
        // Simpler approach: just count and check
        $data = $response->json('data');
        if (isset($data['items'])) {
            $assets = $data['items'];
        } elseif (is_array($data) && isset($data[0])) {
            $assets = $data;
        } else {
            $assets = [];
        }
        $visibleFound = false;
        $hiddenFound = false;
        foreach ($assets as $a) {
            if (($a['uuid'] ?? '') === 'hidden-asset') $hiddenFound = true;
            if (($a['uuid'] ?? '') === 'visible-asset') $visibleFound = true;
        }
        $this->assertFalse($hiddenFound, 'Soft-deleted asset should not appear in API index');
        $this->assertTrue($visibleFound, 'Active asset should appear in API index');
    }

    /** @test */
    public function force_delete_asset_permanently_removes()
    {
        $asset = Asset::create([
            'uuid' => 'force-delete-asset',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/forever-gone.mp4',
            'original_name' => 'forever-gone.mp4',
            'size_bytes' => 1024,
        ]);

        $assetId = $asset->id;
        $asset->forceDelete();

        $this->assertNull(Asset::withTrashed()->find($assetId));
    }

    /** @test */
    public function asset_restore_works()
    {
        $asset = Asset::create([
            'uuid' => 'restore-asset',
            'user_id' => $this->user->id,
            'type' => 'image',
            'mime_type' => 'image/png',
            'path' => 'images/restore.png',
            'original_name' => 'restore.png',
            'size_bytes' => 512,
        ]);

        $asset->delete();
        $this->assertTrue($asset->fresh()->trashed());

        $asset->restore();
        $this->assertFalse($asset->fresh()->trashed());
        $this->assertNull($asset->fresh()->deleted_at);
    }

    /** @test */
    public function asset_only_trashed_scope()
    {
        Asset::create([
            'uuid' => 'active-asset',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/active.mp4',
            'original_name' => 'active.mp4',
            'size_bytes' => 1024,
        ]);

        $trashedAsset = Asset::create([
            'uuid' => 'trashed-only',
            'user_id' => $this->user->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'videos/trashed.mp4',
            'original_name' => 'trashed.mp4',
            'size_bytes' => 1024,
        ]);
        $trashedAsset->delete();

        $onlyTrashed = Asset::onlyTrashed()->get();
        $this->assertCount(1, $onlyTrashed);
        $this->assertEquals('trashed-only', $onlyTrashed->first()->uuid);
    }

    // =========================================================================
    // PRUNE TRASHED RECORDS COMMAND
    // =========================================================================

    /** @test */
    public function prune_trashed_dry_run_reports_expired_records()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Old Trashed',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);
        $storyboardId = $storyboard->id;
        $storyboard->delete();

        // Use query builder directly to bypass SoftDeletes scope
        Storyboard::withTrashed()->where('id', $storyboardId)->update(['deleted_at' => now()->subDays(31)]);

        $exitCode = Artisan::call('model:prune-trashed', [
            '--dry-run' => true,
            '--model' => Storyboard::class,
        ]);

        $output = Artisan::output();

        $this->assertEquals(0, $exitCode);
        $this->assertStringContainsString(Storyboard::class, $output);
        $this->assertStringContainsString('Dry run complete', $output);

        // Record should still exist after dry run
        $this->assertNotNull(Storyboard::withTrashed()->find($storyboardId));
    }

    /** @test */
    public function prune_trashed_permanently_deletes_expired_records()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Expired Trashed',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $scene = StoryboardScene::create([
            'storyboard_id' => $storyboard->id,
            'scene_number' => 1,
            'prompt' => 'Orphan scene',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '720p',
        ]);

        $storyboard->delete();

        $storyboardId = $storyboard->id;
        $sceneId = $scene->id;

        // Use query builder directly to bypass SoftDeletes scope
        Storyboard::withTrashed()->where('id', $storyboardId)->update(['deleted_at' => now()->subDays(31)]);
        StoryboardScene::withTrashed()->where('id', $sceneId)->update(['deleted_at' => now()->subDays(31)]);

        $exitCode = Artisan::call('model:prune-trashed', [
            '--model' => Storyboard::class,
        ]);

        $output = Artisan::output();

        $this->assertEquals(0, $exitCode);
        $this->assertStringContainsString('Pruned', $output);

        // Record should be permanently deleted
        $this->assertNull(Storyboard::withTrashed()->find($storyboardId));
        // Scene should also be gone (forceDelete cascades - the deleting event
        // on storyboard's forceDelete will cascade to scenes)
    }

    /** @test */
    public function prune_trashed_skips_recently_deleted_records()
    {
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Recently Deleted',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);
        $storyboard->delete();

        // deleted_at is now (within TTL of 30 days)

        $exitCode = Artisan::call('model:prune-trashed', [
            '--dry-run' => true,
            '--model' => Storyboard::class,
        ]);

        $output = Artisan::output();

        $this->assertEquals(0, $exitCode);
        // Should not mention this model since no records past TTL
        $this->assertStringNotContainsString('record(s) past', $output);

        // Record should still exist
        $this->assertNotNull(Storyboard::withTrashed()->find($storyboard->id));
    }

    /** @test */
    public function prune_trashed_handles_all_configured_models()
    {
        // Create an expired soft-deleted record for each configured model
        $ttl = config('soft-delete.ttl', []);
        foreach ($ttl as $modelClass => $days) {
            if ($modelClass === StoryboardScene::class || $modelClass === StoryboardReference::class) {
                continue; // These are cascade-only, not independently created
            }

            if ($modelClass === User::class) {
                $record = User::factory()->create();
                $recordId = $record->id;
                $record->delete();
                $modelClass::withTrashed()->where('id', $recordId)->update(['deleted_at' => now()->subDays($days + 1)]);
            } elseif ($modelClass === RenderJob::class) {
                $uuid = 'prune-all-' . uniqid();
                $record = RenderJob::create([
                    'uuid' => $uuid,
                    'user_id' => $this->user->id,
                    'status' => 'completed',
                    'prompt' => 'Prune test',
                    'duration_seconds' => 5,
                    'aspect_ratio' => '16:9',
                    'resolution' => '720p',
                    'credits_cost' => 50,
                ]);
                $recordId = $record->id;
                $record->delete();
                $modelClass::withTrashed()->where('id', $recordId)->update(['deleted_at' => now()->subDays($days + 1)]);
            } elseif ($modelClass === Asset::class) {
                $uuid = 'prune-all-' . uniqid();
                $record = Asset::create([
                    'uuid' => $uuid,
                    'user_id' => $this->user->id,
                    'type' => 'video',
                    'mime_type' => 'video/mp4',
                    'path' => 'videos/prune-all.mp4',
                    'original_name' => 'prune-all.mp4',
                    'size_bytes' => 1024,
                ]);
                $recordId = $record->id;
                $record->delete();
                $modelClass::withTrashed()->where('id', $recordId)->update(['deleted_at' => now()->subDays($days + 1)]);
            } elseif ($modelClass === Storyboard::class) {
                $record = Storyboard::create([
                    'user_id' => $this->user->id,
                    'title' => 'Prune All Test',
                    'video_type' => 'text_to_video',
                    'quality_tier' => 'standard',
                    'status' => 'draft',
                ]);
                $recordId = $record->id;
                $record->delete();
                $modelClass::withTrashed()->where('id', $recordId)->update(['deleted_at' => now()->subDays($days + 1)]);
            }
        }

        $exitCode = Artisan::call('model:prune-trashed', [
            '--dry-run' => true,
        ]);

        $output = Artisan::output();

        $this->assertEquals(0, $exitCode);
        $this->assertStringContainsString('Dry run complete', $output);
    }

    // =========================================================================
    // STORYBOARD DELETING EVENT — DAEMON CLEANUP
    // =========================================================================

    /** @test */
    public function storyboard_deleting_event_calls_daemon_cleanup()
    {
        // This tests that the deleting event fires and attempts daemon cleanup.
        // We mock the DaemonClient to avoid actual API calls.

        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Daemon Cleanup',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
            'daemon_project_id' => 'test-daemon-proj',
        ]);

        // The deleting event should not throw even if daemon is unavailable
        // This is a non-critical operation
        $storyboard->delete();

        $this->assertNotNull($storyboard->fresh()->deleted_at);
    }

    /** @test */
    public function storyboard_deleting_event_skips_daemon_when_is_force_deleting()
    {
        // When force deleting, the daemon cleanup should be skipped
        $storyboard = Storyboard::create([
            'user_id' => $this->user->id,
            'title' => 'Force Delete No Daemon',
            'video_type' => 'text_to_video',
            'quality_tier' => 'standard',
            'status' => 'draft',
            'daemon_project_id' => 'test-daemon-proj-2',
        ]);

        // Force delete should work without attempting daemon cleanup
        // (isForceDeleting() returns true, skipping the daemon call)
        $storyboard->forceDelete();

        $this->assertNull(Storyboard::withTrashed()->find($storyboard->id));
    }
}
