<?php

namespace Tests\Feature;

use App\Services\SkillAuthoringService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Guards the "self-improving skills loop" wiring on the backend:
 *  - SkillAuthoringService::authorDraft reads the daemon's optional `sample`
 *    (auto-verify image + style-match verdict), builds a full daemon URL for it,
 *    and stays tolerant of a missing/degraded sample.
 *  - skills:refresh-examples is registered on the scheduler.
 */
class SkillAuthoringSampleTest extends TestCase
{
    use RefreshDatabase;

    protected string $skillsRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skillsRoot = sys_get_temp_dir().'/skills-author-'.uniqid();
        mkdir($this->skillsRoot, 0775, true);
        config([
            'daemon.skills_path' => $this->skillsRoot,
            'daemon.base_url' => 'http://daemon-test:7456',
        ]);
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
            $p = $dir.'/'.$e;
            is_dir($p) ? $this->rrmdir($p) : @unlink($p);
        }
        @rmdir($dir);
    }

    /** A minimal image-direction skill that satisfies SkillService::REQUIRED_KEYS. */
    private function fakeAuthor(?array $sample): void
    {
        $skill = [
            'id' => 'auto-verify-test',
            'label' => 'Auto Verify Test',
            'label_en' => 'Auto Verify Test',
            'description' => 'A skill authored for the auto-verify test.',
            'example_prompt' => 'Một sản phẩm tối giản trên nền pastel',
            'example_prompt_vi' => 'Một sản phẩm tối giản trên nền pastel',
            'style_keywords' => ['minimal', 'pastel', 'soft light'],
            'prompt_template' => 'A {subject}, minimal pastel studio look',
            'default_negative' => 'clutter, harsh shadows',
            'body' => "# Auto Verify Test\n\nHướng dẫn ở đây.",
        ];

        $payload = ['skill' => $skill];
        if ($sample !== null) {
            $payload['sample'] = $sample;
        }

        Http::fake([
            '*/api/media/skills/author' => Http::response($payload),
            '*/api/media/skills/reload' => Http::response(['ok' => true]),
        ]);
    }

    public function test_attaches_sample_and_builds_full_daemon_url(): void
    {
        $this->fakeAuthor([
            'imageUrl' => '/api/projects/__skill_verify__/raw/abc123.png',
            'model' => 'qwen-image-max',
            'styleMatch' => ['match' => true, 'score' => 0.95, 'notes' => 'Khớp tốt phong cách.'],
        ]);

        $draft = app(SkillAuthoringService::class)->authorDraft('image-direction', 'ảnh sản phẩm tối giản pastel');

        $this->assertSame('image-direction/auto-verify-test', $draft['id']);
        $this->assertArrayHasKey('sample', $draft);
        $this->assertTrue($draft['sample']['styleMatch']['match']);
        $this->assertSame(
            'http://daemon-test:7456/api/projects/__skill_verify__/raw/abc123.png',
            $draft['sample']['imageFullUrl'],
        );
        // Original relative path is preserved alongside the built full URL.
        $this->assertSame('/api/projects/__skill_verify__/raw/abc123.png', $draft['sample']['imageUrl']);
    }

    public function test_missing_sample_is_tolerated(): void
    {
        $this->fakeAuthor(null);

        $draft = app(SkillAuthoringService::class)->authorDraft('image-direction', 'brief nào đó');

        $this->assertSame('image-direction/auto-verify-test', $draft['id']);
        $this->assertArrayNotHasKey('sample', $draft);
    }

    public function test_degraded_sample_is_attached_without_url(): void
    {
        $this->fakeAuthor(['degraded' => true, 'error' => 'verify model key invalid']);

        $draft = app(SkillAuthoringService::class)->authorDraft('image-direction', 'brief');

        $this->assertArrayHasKey('sample', $draft);
        $this->assertTrue($draft['sample']['degraded']);
        $this->assertArrayNotHasKey('imageFullUrl', $draft['sample']);
    }

    public function test_refresh_examples_command_is_scheduled(): void
    {
        $schedule = app(Schedule::class);

        $commands = collect($schedule->events())
            ->map(fn ($event) => $event->command ?? '')
            ->filter(fn ($c) => str_contains((string) $c, 'skills:refresh-examples'));

        $this->assertTrue($commands->isNotEmpty(), 'skills:refresh-examples should be registered on the scheduler.');
    }
}
