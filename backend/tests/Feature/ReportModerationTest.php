<?php

namespace Tests\Feature;

use App\Filament\Resources\ReportResource\Pages\ListReports;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\Report;
use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * Admin content-moderation flow: an admin reviews a report and force-unpublishes
 * the reported content from the community feed via the ReportResource action.
 */
class ReportModerationTest extends TestCase
{
    use RefreshDatabase;

    private Plan $plan;

    protected function setUp(): void
    {
        parent::setUp();

        config(['queue.default' => 'sync', 'broadcasting.default' => 'null']);

        // super_admin bypasses Shield authorization (define_via_gate: before).
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);

        $this->plan = Plan::create([
            'name' => 'Free', 'slug' => 'free',
            'max_concurrent_jobs' => 1, 'monthly_credits' => 100,
            'price_regular' => 0,
        ]);

        Filament::setCurrentPanel(Filament::getPanel('admin'));
    }

    private function makePublishedJob(User $owner): RenderJob
    {
        $job = RenderJob::create([
            'user_id' => $owner->id,
            'status' => 'completed',
            'prompt' => 'reported content',
            'title' => 'Reported Asset',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
            'credits_cost' => 1000,
            'output_path' => '/output/reported.mp4',
            'thumbnail_path' => '/thumb/reported.jpg',
            'completed_at' => now(),
        ]);

        // 'sharing' publishes to the community feed without triggering payout.
        $job->publish('sharing');

        return $job;
    }

    /** @test */
    public function admin_force_unpublish_removes_content_from_feed_and_resolves_report(): void
    {
        $owner = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'owner_user']);
        $reporter = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'reporter_user']);
        $admin = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'admin_user']);
        $admin->assignRole('super_admin');

        $job = $this->makePublishedJob($owner);

        $report = Report::create([
            'user_id' => $reporter->id,
            'render_job_id' => $job->id,
            'reason' => 'inappropriate',
            'details' => 'Nội dung không phù hợp',
        ]);

        // The reported asset is visible on the public community feed.
        $this->getJson('/api/v1/community/assets')
            ->assertOk()
            ->assertJsonFragment(['uuid' => $job->uuid]);

        // Admin force-unpublishes it through the Filament ReportResource action.
        Livewire::actingAs($admin)
            ->test(ListReports::class)
            ->callTableAction('force_unpublish', $report)
            ->assertHasNoTableActionErrors();

        // The asset is gone from the feed.
        $feed = $this->getJson('/api/v1/community/assets')->assertOk();
        $uuids = collect($feed->json('data.items'))->pluck('uuid')->all();
        $this->assertNotContains($job->uuid, $uuids);

        // The content is hidden and the report is marked resolved by this admin.
        $this->assertFalse($job->fresh()->isPublished());
        $report->refresh();
        $this->assertSame(Report::STATUS_RESOLVED, $report->status);
        $this->assertSame($admin->id, $report->reviewed_by);
        $this->assertNotNull($report->reviewed_at);
    }

    /** @test */
    public function admin_dismiss_marks_report_dismissed_without_unpublishing(): void
    {
        $owner = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'owner_two']);
        $reporter = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'reporter_two']);
        $admin = User::factory()->create(['plan_id' => $this->plan->id, 'username' => 'admin_two']);
        $admin->assignRole('super_admin');

        $job = $this->makePublishedJob($owner);

        $report = Report::create([
            'user_id' => $reporter->id,
            'render_job_id' => $job->id,
            'reason' => 'spam',
        ]);

        Livewire::actingAs($admin)
            ->test(ListReports::class)
            ->callTableAction('dismiss', $report)
            ->assertHasNoTableActionErrors();

        // Content stays published; report is dismissed.
        $this->assertTrue($job->fresh()->isPublished());
        $report->refresh();
        $this->assertSame(Report::STATUS_DISMISSED, $report->status);
        $this->assertSame($admin->id, $report->reviewed_by);
    }
}
