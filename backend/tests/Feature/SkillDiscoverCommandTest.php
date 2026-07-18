<?php

namespace Tests\Feature;

use App\Services\SkillAuthoringService;
use App\Settings\AiSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

/**
 * Guards skills:discover — the trend-driven self-authoring loop. Verifies it
 * web-searches trends, asks the LLM for gaps, dedupes against existing labels,
 * caps per-category output, and authors the rest as drafts via
 * SkillAuthoringService (mocked so no disk/daemon writes happen).
 */
class SkillDiscoverCommandTest extends TestCase
{
    use RefreshDatabase;

    protected string $skillsRoot;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skillsRoot = sys_get_temp_dir().'/skills-disc-'.uniqid();
        mkdir($this->skillsRoot, 0775, true);
        config(['daemon.skills_path' => $this->skillsRoot]);

        // Configure admin AI settings so the backend can resolve LLM + Tavily.
        $s = app(AiSettings::class);
        $s->llm_provider = 'custom';
        $s->llm_base_url = 'https://llm.test';
        $s->llm_api_key = 'llm-key';
        $s->llm_model = 'test-model';
        $s->search_provider = 'tavily';
        $s->search_api_key = 'tavily-key';
        $s->save();
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

    private function writeSkill(string $relDir, string $label): void
    {
        $dir = $this->skillsRoot.'/'.$relDir;
        mkdir($dir, 0775, true);
        file_put_contents($dir.'/SKILL.md', "---\nid: ".basename($relDir)."\nlabel: {$label}\n---\n# {$label}\n");
    }

    private function fakeHttp(array $gaps): void
    {
        Http::fake([
            'api.tavily.com/*' => Http::response([
                'results' => [
                    ['title' => 'Top styles 2026', 'content' => 'Chrome Y2K and liquid metal are trending'],
                ],
            ]),
            'llm.test/*' => Http::response([
                'choices' => [['message' => ['content' => json_encode($gaps)]]],
            ]),
        ]);
    }

    public function test_authors_new_gap_and_skips_duplicate_and_caps(): void
    {
        // Existing skill in video-direction with label "Cinematic".
        $this->writeSkill('video-direction/cinematic', 'Cinematic');
        // No image-direction skills so that category resolves labels = [].

        // LLM returns 3 gaps: one duplicate of "Cinematic", two new ones.
        // With --max=1 only the FIRST eligible new gap should be authored.
        $this->fakeHttp([
            ['label' => 'Cinematic', 'brief' => 'A cinematic film look with shallow depth of field.'],
            ['label' => 'Liquid Chrome', 'brief' => 'Glossy liquid chrome metal surfaces with reflections.'],
            ['label' => 'Vaporwave', 'brief' => 'Retro 80s neon vaporwave aesthetic with grids.'],
        ]);

        $authored = [];
        $mock = Mockery::mock(SkillAuthoringService::class);
        $mock->shouldReceive('authorDraft')
            ->andReturnUsing(function (string $category, string $brief) use (&$authored) {
                $authored[] = ['category' => $category, 'brief' => $brief];

                return ['id' => $category.'/generated-'.count($authored)];
            });
        $this->app->instance(SkillAuthoringService::class, $mock);

        $this->artisan('skills:discover', ['--max' => 1, '--category' => 'video-direction'])
            ->assertExitCode(0);

        // Cap = 1, duplicate "Cinematic" skipped ⇒ exactly one authoring call.
        $this->assertCount(1, $authored);
        $this->assertSame('video-direction', $authored[0]['category']);
        $this->assertStringContainsString('Liquid Chrome', $authored[0]['brief']);
    }

    public function test_fail_open_when_llm_returns_no_gaps(): void
    {
        $this->writeSkill('video-direction/cinematic', 'Cinematic');
        $this->fakeHttp([]); // LLM returns empty array

        $mock = Mockery::mock(SkillAuthoringService::class);
        $mock->shouldNotReceive('authorDraft');
        $this->app->instance(SkillAuthoringService::class, $mock);

        $this->artisan('skills:discover', ['--category' => 'video-direction'])
            ->assertExitCode(0);
    }

    public function test_dry_run_does_not_author(): void
    {
        $this->writeSkill('video-direction/cinematic', 'Cinematic');
        $this->fakeHttp([
            ['label' => 'Liquid Chrome', 'brief' => 'Glossy liquid chrome metal surfaces with reflections.'],
        ]);

        $mock = Mockery::mock(SkillAuthoringService::class);
        $mock->shouldNotReceive('authorDraft');
        $this->app->instance(SkillAuthoringService::class, $mock);

        $this->artisan('skills:discover', ['--dry-run' => true, '--category' => 'video-direction'])
            ->assertExitCode(0);
    }
}
