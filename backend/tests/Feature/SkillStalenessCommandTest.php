<?php

namespace Tests\Feature;

use App\Services\SkillStalenessService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Guards skills:check-staleness — the anti-outdate auditor. Verifies it flags
 * model references absent from config/media_providers.php and pricing drift,
 * while leaving clean (in-catalog) references alone.
 */
class SkillStalenessCommandTest extends TestCase
{
    use RefreshDatabase;

    protected string $skillsRoot;

    protected function setUp(): void
    {
        parent::setUp();
        Http::fake();

        $this->skillsRoot = sys_get_temp_dir().'/skills-stale-'.uniqid();
        mkdir($this->skillsRoot, 0775, true);
        config(['daemon.skills_path' => $this->skillsRoot]);
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

    private function writeSkill(string $relDir, string $file, string $content): void
    {
        $dir = $this->skillsRoot.'/'.$relDir;
        mkdir($dir, 0775, true);
        file_put_contents($dir.'/'.$file, $content);
    }

    public function test_flags_unknown_model_reference(): void
    {
        // Bogus skill mentions competitor models NOT in the catalog.
        $this->writeSkill('image-direction/bogus', 'SKILL.md', <<<'MD'
---
id: bogus
label: Bogus
---
# Bogus
Use kling-2.5-master and seedance-1.0-pro for best results.
MD);

        $findings = app(SkillStalenessService::class)->check();

        $this->assertCount(1, $findings);
        $joined = implode(' ', $findings[0]['issues']);
        $this->assertStringContainsString('kling-2.5-master', $joined);
        $this->assertStringContainsString('seedance-1.0-pro', $joined);
    }

    public function test_does_not_flag_catalog_models(): void
    {
        // Only references real catalog models + a family shorthand.
        $this->writeSkill('video-contract', 'SKILL.md', <<<'MD'
---
id: video-contract
label: Contract
---
# Contract
Primary models: wan2.6-t2v, wan2.7-r2v, qwen-image-max, z-image-turbo.
The Wan2.6 and Wan2.7 families are audio-capable.
MD);

        $findings = app(SkillStalenessService::class)->check();

        $this->assertSame([], $findings);
    }

    public function test_flags_pricing_drift(): void
    {
        // Live exchange rate defaults to 0.1; a doc hardcoding 0.999 must flag.
        $this->writeSkill('video-contract', 'PRICING-LOGIC.md', "exchange_rate = 0.999\n");

        $findings = app(SkillStalenessService::class)->check();

        $this->assertCount(1, $findings);
        $this->assertStringContainsString('Pricing drift', implode(' ', $findings[0]['issues']));
    }

    public function test_command_runs_and_strict_flag_exits_nonzero_on_findings(): void
    {
        $this->writeSkill('image-direction/bogus', 'SKILL.md', "# x\nUse veo-9 model.\n");

        $this->artisan('skills:check-staleness')->assertExitCode(0);
        $this->artisan('skills:check-staleness', ['--strict' => true])->assertExitCode(1);
    }

    public function test_command_clean_reports_success(): void
    {
        $this->writeSkill('image-direction/ok', 'SKILL.md', "# ok\nUse wan2.6-t2v.\n");

        $this->artisan('skills:check-staleness')
            ->expectsOutputToContain('Không phát hiện skill lỗi thời')
            ->assertExitCode(0);
    }
}
