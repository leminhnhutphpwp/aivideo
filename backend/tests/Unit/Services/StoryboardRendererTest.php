<?php

namespace Tests\Unit\Services;

use App\Models\Asset;
use App\Models\Storyboard;
use App\Models\User;
use App\Services\AssetService;
use App\Services\CreditService;
use App\Services\DaemonClient;
use App\Services\StoryboardRenderer;
use App\Services\StoryboardTypeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StoryboardRendererTest extends TestCase
{
    use RefreshDatabase;

    private StoryboardRenderer $renderer;
    private User $user;
    private Storyboard $storyboard;
    private $daemonClient;
    private $creditService;
    private $storyboardTypeService;
    private $assetService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['credits' => 50000]);

        $this->storyboard = Storyboard::create([
            'uuid' => 'renderer-test-sb-uuid',
            'user_id' => $this->user->id,
            'title' => 'Renderer Test Storyboard',
            'status' => 'rendering',
            'video_type' => 'storyboard_video',
            'quality_tier' => 'standard',
            'render_mode' => 'single_flow',
            'daemon_project_id' => 'renderer-test-project',
            'daemon_task_id' => 'renderer-test-task',
        ]);

        $this->daemonClient = $this->mock(DaemonClient::class);
        $this->creditService = $this->mock(CreditService::class);
        $this->storyboardTypeService = $this->mock(StoryboardTypeService::class);
        $this->assetService = $this->mock(AssetService::class);
    }

    protected function createRenderer(): StoryboardRenderer
    {
        return new StoryboardRenderer(
            $this->daemonClient,
            $this->creditService,
            $this->storyboardTypeService,
            $this->assetService,
        );
    }

    public function test_handle_single_flow_completion_creates_asset(): void
    {
        $this->daemonClient->shouldReceive('downloadFile')
            ->with('renderer-test-project', 'output/final.mp4')
            ->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'dl_');
                file_put_contents($path, 'final-video-content');
                return $path;
            });

        $this->assetService->shouldReceive('storeFromPath')
            ->once()
            ->with(
                \Mockery::on(fn($u) => $u->id === $this->user->id),
                null,
                'video',
                \Mockery::type('string'),
                \Mockery::on(fn($sb) => $sb->id === $this->storyboard->id),
            )
            ->andReturnUsing(function ($user, $job, $type, $sourcePath, $storyboard) {
                return Asset::create([
                    'uuid' => 'storyboard-asset-uuid',
                    'user_id' => $user->id,
                    'storyboard_id' => $storyboard->id,
                    'type' => $type,
                    'mime_type' => 'video/mp4',
                    'path' => 'videos/storyboard_final.mp4',
                    'original_name' => 'storyboard_final.mp4',
                    'size_bytes' => filesize($sourcePath),
                ]);
            });

        $this->creditService->shouldReceive('captureStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'output_path' => 'output/final.mp4',
        ]);

        $this->storyboard->refresh();

        $this->assertEquals('completed', $this->storyboard->status);
        $this->assertEquals('output/final.mp4', $this->storyboard->output_path);

        $this->assertDatabaseHas('assets', [
            'uuid' => 'storyboard-asset-uuid',
            'user_id' => $this->user->id,
            'storyboard_id' => $this->storyboard->id,
            'render_job_id' => null,
            'type' => 'video',
        ]);
    }

    public function test_handle_single_flow_completion_passes_null_job_to_asset_service(): void
    {
        $this->daemonClient->shouldReceive('downloadFile')
            ->with('renderer-test-project', 'output/final.mp4')
            ->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'dl_');
                file_put_contents($path, 'final-video-content');
                return $path;
            });

        $this->assetService->shouldReceive('storeFromPath')
            ->once()
            ->with(
                \Mockery::on(fn($u) => $u->id === $this->user->id),
                null,  // job is explicitly null
                'video',
                \Mockery::type('string'),
                \Mockery::on(fn($sb) => $sb->id === $this->storyboard->id),
            )
            ->andReturn(Asset::create([
                'uuid' => 'storyboard-no-job-uuid',
                'user_id' => $this->user->id,
                'storyboard_id' => $this->storyboard->id,
                'type' => 'video',
                'mime_type' => 'video/mp4',
                'path' => 'videos/test.mp4',
                'original_name' => 'test.mp4',
                'size_bytes' => 100,
            ]));

        $this->creditService->shouldReceive('captureStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'output_path' => 'output/final.mp4',
        ]);
    }

    public function test_handle_single_flow_completion_asset_type_is_video(): void
    {
        $this->daemonClient->shouldReceive('downloadFile')
            ->with('renderer-test-project', 'output/final.mp4')
            ->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'dl_');
                file_put_contents($path, 'video-content');
                return $path;
            });

        $this->assetService->shouldReceive('storeFromPath')
            ->once()
            ->with(
                \Mockery::any(),
                null,
                'video',  // type must be video
                \Mockery::type('string'),
                \Mockery::any(),
            )
            ->andReturn(Asset::create([
                'uuid' => 'storyboard-video-uuid',
                'user_id' => $this->user->id,
                'storyboard_id' => $this->storyboard->id,
                'type' => 'video',
                'mime_type' => 'video/mp4',
                'path' => 'videos/final.mp4',
                'original_name' => 'final.mp4',
                'size_bytes' => 100,
            ]));

        $this->creditService->shouldReceive('captureStoryboardReserved')->once();

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'output_path' => 'output/final.mp4',
        ]);

        $asset = Asset::where('uuid', 'storyboard-video-uuid')->first();
        $this->assertEquals('video', $asset->type);
    }

    public function test_handle_single_flow_completion_ignores_terminal_storyboard(): void
    {
        $this->storyboard->markAsCompleted('/old/output.mp4');

        $this->daemonClient->shouldNotReceive('downloadFile');
        $this->assetService->shouldNotReceive('storeFromPath');
        $this->creditService->shouldNotReceive('captureStoryboardReserved');

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'output_path' => 'output/new.mp4',
        ]);

        $this->storyboard->refresh();
        $this->assertEquals('/old/output.mp4', $this->storyboard->output_path);
    }

    public function test_handle_single_flow_completion_captures_credits(): void
    {
        $this->daemonClient->shouldReceive('downloadFile')
            ->with('renderer-test-project', 'output/final.mp4')
            ->andReturnUsing(function () {
                $path = tempnam(sys_get_temp_dir(), 'dl_');
                file_put_contents($path, 'video-content');
                return $path;
            });

        $this->assetService->shouldReceive('storeFromPath')
            ->once()
            ->andReturn(Asset::create([
                'uuid' => 'storyboard-credit-uuid',
                'user_id' => $this->user->id,
                'storyboard_id' => $this->storyboard->id,
                'type' => 'video',
                'mime_type' => 'video/mp4',
                'path' => 'videos/final.mp4',
                'original_name' => 'final.mp4',
                'size_bytes' => 100,
            ]));

        $this->creditService->shouldReceive('captureStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'output_path' => 'output/final.mp4',
        ]);
    }

    public function test_handle_single_flow_completion_no_output_path_fails_storyboard(): void
    {
        $this->daemonClient->shouldNotReceive('downloadFile');
        $this->assetService->shouldNotReceive('storeFromPath');

        $this->creditService->shouldReceive('releaseStoryboardReserved')
            ->once()
            ->with(\Mockery::on(fn($sb) => $sb->id === $this->storyboard->id));

        $renderer = $this->createRenderer();

        $renderer->handleSingleFlowCompletion($this->storyboard, [
            'error' => 'Generation failed: timeout',
        ]);

        $this->storyboard->refresh();
        $this->assertEquals('failed', $this->storyboard->status);
        // When an error key is provided, that message is used instead of the default
        $this->assertEquals('Generation failed: timeout', $this->storyboard->error_message);
    }

    public function test_render_single_flow_auto_generates_and_attaches_multi_panel_image(): void
    {
        \Illuminate\Support\Facades\Storage::fake();

        // storyboard_image / multi mode, user provided NO image → system must auto-generate.
        $this->storyboard->update([
            'render_mode' => 'storyboard_image',
            'shot_type' => 'multi',
            'compiled_prompt' => 'a compiled multi-panel prompt',
            'multi_panel_image' => null,
            'multi_panel_auto_generated' => false,
            'daemon_project_id' => null,
            'daemon_task_id' => null,
        ]);
        \App\Models\StoryboardScene::create([
            'storyboard_id' => $this->storyboard->id,
            'scene_number' => 1,
            'prompt' => 'scene 1',
            'duration_seconds' => 5,
            'aspect_ratio' => '16:9',
            'status' => 'pending',
        ]);

        $this->mock(\App\Services\AiPromptCompiler::class)
            ->shouldReceive('compileForImage')->andReturn('fake image prompt');
        $this->storyboardTypeService->shouldReceive('getCapability')->andReturn('r2v');
        $this->mock(\App\Services\ModelSelector::class)
            ->shouldReceive('resolve')->andReturn('wan2.7-i2v');

        // Stage 1 — multi-panel image generation (saved to the DEFAULT disk).
        $this->daemonClient->shouldReceive('createProject')
            ->with('multi-panel-' . $this->storyboard->uuid, \Mockery::any())
            ->andReturn('mp-project');
        $this->daemonClient->shouldReceive('generateMedia')
            ->with('mp-project', \Mockery::on(fn ($p) => ($p['capability'] ?? null) === 't2i'), \Mockery::any())
            ->andReturn('mp-task');
        $this->daemonClient->shouldReceive('getTaskStatus')
            ->andReturn(['status' => 'done', 'file' => ['name' => 'panel.png']]);
        $this->daemonClient->shouldReceive('downloadFile')
            ->with('mp-project', 'panel.png')
            ->andReturnUsing(function () {
                $p = tempnam(sys_get_temp_dir(), 'panel_');
                file_put_contents($p, 'PNGDATA');
                return $p;
            });

        // Stage 2 — video render MUST receive the uploaded panel as reference_image.
        $this->daemonClient->shouldReceive('createProject')
            ->with($this->storyboard->uuid . '-single-flow', \Mockery::any())
            ->andReturn('sf-project');
        $this->daemonClient->shouldReceive('uploadFile')
            ->with('sf-project', \Mockery::type('string'))
            ->once()
            ->andReturn('uploaded-panel.png');

        $capturedReference = null;
        $this->daemonClient->shouldReceive('generateMedia')
            ->with('sf-project', \Mockery::on(function ($p) use (&$capturedReference) {
                $capturedReference = $p['reference_image'] ?? null;
                return ($p['capability'] ?? null) !== 't2i';
            }), \Mockery::any())
            ->andReturn('video-task');

        $result = $this->createRenderer()->renderSingleFlow($this->storyboard);

        $this->assertTrue($result['success']);
        // Disk fix: the auto-generated image (default disk) is read back and handed to the
        // daemon as reference_image — previously it was read from the wrong disk and dropped.
        $this->assertEquals('uploaded-panel.png', $capturedReference);

        $this->storyboard->refresh();
        $this->assertTrue((bool) $this->storyboard->multi_panel_auto_generated);
        $this->assertNotEmpty($this->storyboard->multi_panel_image);
    }

    public function test_auto_generated_multi_panel_path_is_hidden_from_serialization(): void
    {
        $this->storyboard->update([
            'multi_panel_image' => 'storyboards/x/multi_panel_1.png',
            'multi_panel_auto_generated' => true,
        ]);

        // Hidden from API output (security)...
        $this->assertNull($this->storyboard->fresh()->toArray()['multi_panel_image']);
        // ...but still readable by the renderer via direct attribute access.
        $this->assertEquals('storyboards/x/multi_panel_1.png', $this->storyboard->fresh()->multi_panel_image);

        // A user-provided image (flag false) stays visible.
        $this->storyboard->update(['multi_panel_auto_generated' => false]);
        $this->assertEquals('storyboards/x/multi_panel_1.png', $this->storyboard->fresh()->toArray()['multi_panel_image']);
    }
}
