<?php

namespace Tests\Feature;

use App\Services\SkillService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Guards the "authoring" hardening on SkillService::save():
 *  - required frontmatter keys per category are enforced (no silently-broken skills),
 *  - video-marketing-psychology is a recognised 'single' daemon collection.
 */
class SkillServiceValidationTest extends TestCase
{
    protected string $skillsRoot;

    protected function setUp(): void
    {
        parent::setUp();

        // Stub the daemon cache-reload call that save() fires after every write.
        Http::fake();

        $this->skillsRoot = sys_get_temp_dir().'/skills-test-'.uniqid();
        mkdir($this->skillsRoot, 0775, true);

        // SkillService reads this in its constructor, so set it before instantiating.
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
            $path = $dir.'/'.$e;
            is_dir($path) ? $this->rrmdir($path) : @unlink($path);
        }
        @rmdir($dir);
    }

    /** A complete, valid image-direction frontmatter (all REQUIRED_KEYS present). */
    private function validImageFrontmatter(): string
    {
        return <<<'YAML'
mode: image
surface: image
id: test-style
label: Kiểu thử
label_en: Test Style
description: "Một phong cách thử nghiệm."
example_prompt: "a test subject in a test scene"
example_prompt_vi: "một chủ thể thử trong cảnh thử"
style_keywords: ["test", "sample"]
prompt_template: "test image of {subject}, {style}, {negative}"
default_negative: "blurry, low quality"
YAML;
    }

    public function test_save_rejects_image_skill_missing_required_key(): void
    {
        // Drop default_negative + prompt_template from an otherwise-valid skill.
        $fm = <<<'YAML'
id: broken-style
label: Hỏng
label_en: Broken
description: "Thiếu key."
example_prompt: "x"
example_prompt_vi: "x"
style_keywords: ["x"]
YAML;

        $service = new SkillService;

        try {
            $service->save('image-direction/broken-style', $fm, 'body');
            $this->fail('Expected InvalidArgumentException for missing required keys.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('prompt_template', $e->getMessage());
            $this->assertStringContainsString('default_negative', $e->getMessage());
        }

        // The broken file must NOT have been written.
        $this->assertFileDoesNotExist($this->skillsRoot.'/image-direction/broken-style/SKILL.md');
    }

    public function test_save_rejects_when_required_key_is_empty(): void
    {
        // style_keywords present but empty array → still counts as missing.
        $fm = <<<'YAML'
id: empty-style
label: Rỗng
label_en: Empty
description: "Rỗng."
example_prompt: "x"
example_prompt_vi: "x"
style_keywords: []
prompt_template: "x {negative}"
default_negative: "y"
YAML;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('style_keywords');

        (new SkillService)->save('image-direction/empty-style', $fm, 'body');
    }

    public function test_save_accepts_complete_image_skill(): void
    {
        $service = new SkillService;

        $saved = $service->save('image-direction/test-style', $this->validImageFrontmatter(), '# Test');

        $this->assertSame('image-direction/test-style', $saved['id']);
        $this->assertFileExists($this->skillsRoot.'/image-direction/test-style/SKILL.md');
    }

    public function test_save_rejects_storyboard_type_missing_prompt_template(): void
    {
        $fm = <<<'YAML'
id: my_type
label: My Type
label_en: My Type
capability: t2v
style_keywords: ["a", "b"]
YAML;

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('prompt_template');

        (new SkillService)->save('video-storyboard/types/my-type', $fm, 'body');
    }

    public function test_save_skips_validation_for_single_file_categories(): void
    {
        // Single-file categories carry no REQUIRED_KEYS entry, so a minimal
        // frontmatter is accepted (e.g. video-marketing-psychology doc skill).
        $fm = "id: video-marketing-psychology\nlabel: Tâm lý\nlabel_en: Psychology";

        $saved = (new SkillService)->save('video-marketing-psychology', $fm, '# Doc');

        $this->assertFileExists($this->skillsRoot.'/video-marketing-psychology/SKILL.md');
        $this->assertSame('single', $saved['type']);
    }

    public function test_video_marketing_psychology_is_classified_single_not_unloaded(): void
    {
        $service = new SkillService;

        $this->assertSame(
            ['collection' => 'video-marketing-psychology', 'type' => 'single'],
            $service->collectionFor('video-marketing-psychology'),
        );
    }
}
