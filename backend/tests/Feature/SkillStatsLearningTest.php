<?php

namespace Tests\Feature;

use App\Models\Like;
use App\Models\Plan;
use App\Models\RenderJob;
use App\Models\SkillStat;
use App\Models\User;
use App\Services\SkillService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The self-evolving skill library ("learning loop"):
 *  - render/generate attributes usage to a skill (render_jobs.skill_id + SkillStat.usage_count),
 *  - like/unlike rolls up to the skill's likes_count (clamped at 0),
 *  - publish rolls up to published_count,
 *  - skills:refresh-examples rewrites a skill's example_prompt toward the most-liked
 *    published asset that used it, keeping the SKILL.md frontmatter valid YAML,
 *  - the stats endpoint exposes the counters for studio ranking.
 */
class SkillStatsLearningTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Plan $plan;
    private string $skillsRoot;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'daemon.base_url' => 'http://daemon.test',
            'daemon.webhook_secret' => 'test-secret',
            'queue.default' => 'sync',
            'broadcasting.default' => 'null',
        ]);

        // Isolated skills dir so the learning command can rewrite fixture SKILL.md files
        // without touching real skills. SkillService reads this in its constructor.
        $this->skillsRoot = sys_get_temp_dir().'/skill-stats-test-'.uniqid();
        mkdir($this->skillsRoot, 0775, true);
        config(['daemon.skills_path' => $this->skillsRoot]);

        // Stub daemon calls: generate proxy + skills cache-reload.
        Http::fake(['*' => Http::response(['taskId' => 'task-xyz'], 200)]);

        $this->plan = Plan::create([
            'name' => 'Free', 'slug' => 'free',
            'max_concurrent_jobs' => 5, 'monthly_credits' => 2000,
            'price_regular' => 0, 'quality_multiplier' => 1.0, 'max_renders_per_day' => 50,
        ]);

        $this->user = User::factory()->create(['plan_id' => $this->plan->id, 'credits' => 500000]);
    }

    protected function tearDown(): void
    {
        $this->rrmdir($this->skillsRoot);
        parent::tearDown();
    }

    private function rrmdir(string $dir): void
    {
        if (! is_dir($dir)) {
            return;
        }
        foreach (scandir($dir) ?: [] as $e) {
            if ($e === '.' || $e === '..') {
                continue;
            }
            $p = "$dir/$e";
            is_dir($p) ? $this->rrmdir($p) : @unlink($p);
        }
        @rmdir($dir);
    }

    /** Write a complete, valid image-direction skill fixture and return its id. */
    private function seedImageSkill(string $name, string $examplePrompt = 'original example'): string
    {
        $fm = <<<YAML
mode: image
surface: image
id: {$name}
label: Kiểu {$name}
label_en: Style {$name}
description: "Phong cách thử nghiệm."
example_prompt: "{$examplePrompt}"
example_prompt_vi: "ví dụ gốc"
style_keywords: ["test", "sample"]
prompt_template: "test image of {subject}, {style}, {negative}"
default_negative: "blurry, low quality"
YAML;
        (new SkillService)->save("image-direction/{$name}", $fm, '# Body');

        return "image-direction/{$name}";
    }

    private function completedJob(array $attrs = []): RenderJob
    {
        return RenderJob::create(array_merge([
            'user_id' => $this->user->id,
            'status' => 'completed',
            'prompt' => 'A beautiful sunset over the ocean',
            'title' => 'Sunset',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'resolution' => '1080p',
            'credits_cost' => 2000,
            'output_path' => '/output/x.png',
            'completed_at' => now(),
        ], $attrs));
    }

    // ─── Attribution + usage ──────────────────────────────────────

    public function test_generate_records_skill_usage_and_attributes_skill_id(): void
    {
        $this->actingAs($this->user, 'api');

        $this->postJson('/api/daemon/projects/proj-usage/media/generate', [
            'surface' => 'image',
            'capability' => 't2i',
            'prompt' => 'a serene mountain lake at dawn',
            'skillId' => 'image-direction/natural-photo',
        ])->assertStatus(200);

        $job = RenderJob::where('user_id', $this->user->id)->latest('id')->first();
        $this->assertNotNull($job);
        $this->assertSame('image-direction/natural-photo', $job->skill_id);

        $stat = SkillStat::where('skill_id', 'image-direction/natural-photo')->first();
        $this->assertNotNull($stat);
        $this->assertSame(1, $stat->usage_count);
        $this->assertNotNull($stat->last_used_at);
        $this->assertSame('image-direction', $stat->category);
    }

    public function test_generate_without_skill_creates_no_stat(): void
    {
        $this->actingAs($this->user, 'api');

        $this->postJson('/api/daemon/projects/proj-none/media/generate', [
            'surface' => 'image',
            'capability' => 't2i',
            'prompt' => 'a plain prompt with no skill',
        ])->assertStatus(200);

        $this->assertSame(0, SkillStat::count());
    }

    // ─── Like / unlike ────────────────────────────────────────────

    public function test_like_and_unlike_adjust_skill_likes_count(): void
    {
        $job = $this->completedJob(['skill_id' => 'image-direction/natural-photo']);
        $job->update(['visibility' => 'sharing', 'published_at' => now()]); // likeable only when published

        // Like → +1
        $this->actingAs($this->user, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like")
            ->assertOk()->assertJsonPath('data.liked', true);

        $this->assertSame(1, SkillStat::where('skill_id', 'image-direction/natural-photo')->first()->likes_count);

        // Unlike (toggle) → back to 0, never negative
        $this->actingAs($this->user, 'api')
            ->postJson("/api/render-jobs/{$job->uuid}/like")
            ->assertOk()->assertJsonPath('data.liked', false);

        $this->assertSame(0, SkillStat::where('skill_id', 'image-direction/natural-photo')->first()->likes_count);
    }

    // ─── Publish ──────────────────────────────────────────────────

    public function test_publish_records_skill_published_count(): void
    {
        $proPlan = Plan::create([
            'name' => 'Pro', 'slug' => 'pro',
            'max_concurrent_jobs' => 5, 'monthly_credits' => 5000, 'price_regular' => 149000,
        ]);
        $pro = User::factory()->create(['plan_id' => $proPlan->id, 'credits' => 50000]);

        $job = RenderJob::create([
            'user_id' => $pro->id, 'status' => 'completed', 'prompt' => 'x',
            'title' => 'x', 'duration_seconds' => 5, 'credits_cost' => 2000,
            'output_path' => '/o/x.mp4', 'completed_at' => now(),
            'skill_id' => 'video-direction/cinematic',
        ]);

        $this->actingAs($pro, 'api')
            ->patchJson("/api/render-jobs/{$job->uuid}/publish", ['visibility' => 'sharing'])
            ->assertOk();

        $this->assertSame(1, SkillStat::where('skill_id', 'video-direction/cinematic')->first()->published_count);
    }

    // ─── Stats endpoint ───────────────────────────────────────────

    public function test_stats_endpoint_returns_counters(): void
    {
        SkillStat::create([
            'skill_id' => 'image-direction/natural-photo', 'category' => 'image-direction',
            'usage_count' => 7, 'likes_count' => 3, 'published_count' => 2,
        ]);

        $res = $this->actingAs($this->user, 'api')
            ->getJson('/api/daemon/media/skills/stats');

        $res->assertOk()
            ->assertJsonPath('data.image-direction/natural-photo.usage_count', 7)
            ->assertJsonPath('data.image-direction/natural-photo.likes_count', 3)
            ->assertJsonPath('data.image-direction/natural-photo.published_count', 2);
    }

    // ─── Learning command ─────────────────────────────────────────

    public function test_refresh_examples_learns_prompt_from_most_liked_asset(): void
    {
        $skillId = $this->seedImageSkill('learner', 'original example');

        // Two published assets on this skill; the winner has more likes.
        $winner = $this->completedJob([
            'skill_id' => $skillId, 'prompt' => 'a cinematic golden-hour portrait, soft rim light',
        ]);
        $winner->publish('sharing');
        $loser = $this->completedJob(['skill_id' => $skillId, 'prompt' => 'less popular prompt']);
        $loser->publish('sharing');

        $other = User::factory()->create(['plan_id' => $this->plan->id, 'credits' => 100]);
        foreach ([$this->user, $other] as $u) {
            Like::create(['user_id' => $u->id, 'render_job_id' => $winner->id]);
        }
        Like::create(['user_id' => $this->user->id, 'render_job_id' => $loser->id]);

        $this->artisan('skills:refresh-examples', ['--min-likes' => 2])
            ->assertSuccessful();

        // The on-disk skill now carries the winner's prompt AND stays valid YAML.
        $skill = (new SkillService)->get($skillId);
        $this->assertNotNull($skill);
        $meta = \Symfony\Component\Yaml\Yaml::parse($skill['frontmatter']);
        $this->assertSame('a cinematic golden-hour portrait, soft rim light', $meta['example_prompt']);
        $this->assertSame($winner->uuid, $meta['learned_from_uuid']);
        // Required keys survive the rewrite (skill still loadable).
        $this->assertArrayHasKey('prompt_template', $meta);
        $this->assertArrayHasKey('default_negative', $meta);
    }

    public function test_refresh_examples_skips_when_below_like_threshold(): void
    {
        $skillId = $this->seedImageSkill('shy', 'original example');

        $job = $this->completedJob(['skill_id' => $skillId, 'prompt' => 'not liked enough']);
        $job->publish('sharing');
        Like::create(['user_id' => $this->user->id, 'render_job_id' => $job->id]);

        // Only 1 like, threshold 3 → no change.
        $this->artisan('skills:refresh-examples', ['--min-likes' => 3])
            ->assertSuccessful();

        $meta = \Symfony\Component\Yaml\Yaml::parse((new SkillService)->get($skillId)['frontmatter']);
        $this->assertSame('original example', $meta['example_prompt']);
    }
}
