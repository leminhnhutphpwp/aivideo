<?php

namespace Tests\Feature;

use App\Models\Storyboard;
use App\Models\User;
use App\Services\StoryboardRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Regression for the 2026-06-19 full-system blocker.
 *
 * StoryboardRenderer::resolveModel() called ModelSelector::resolve() with a stale named
 * argument `qualityTierCode:` after that parameter was renamed to $plan. PHP fatalled with
 * "Unknown named parameter $qualityTierCode" the moment a scene was queued. The error was
 * swallowed into the render endpoint's 200 response (it only bumps a `scenes_failed`
 * counter), so EVERY storyboard render silently produced zero queued scenes while the unit
 * suite stayed green.
 *
 * This guards the caller→callee binding directly (no daemon/queue needed): resolveModel()
 * must resolve a usable model id without throwing on the argument shape.
 *
 * @see backend/worklogs/2026-06-19-full-system-test-issues/issue-02-render-qualitytiercode-named-param.md
 */
class StoryboardRenderModelResolutionTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_model_does_not_fatal_on_named_parameter(): void
    {
        $user = User::factory()->create();
        $storyboard = Storyboard::create([
            'user_id' => $user->id,
            'title' => 'Regression resolveModel',
            'video_type' => 'ugc_review',
            'quality_tier' => 'standard',
            'status' => 'draft',
        ]);

        $renderer = app(StoryboardRenderer::class);
        $resolveModel = new ReflectionMethod($renderer, 'resolveModel');
        $resolveModel->setAccessible(true);

        // Before the fix this line threw "Unknown named parameter $qualityTierCode".
        $model = $resolveModel->invoke($renderer, $storyboard);

        $this->assertIsString($model);
        $this->assertNotEmpty($model, 'resolveModel must return a usable model id');
    }

    public function test_resolve_model_handles_each_quality_tier(): void
    {
        $user = User::factory()->create();

        foreach (['standard', 'premium', 'ultra'] as $tier) {
            $storyboard = Storyboard::create([
                'user_id' => $user->id,
                'title' => "Regression resolveModel {$tier}",
                'video_type' => 'ugc_review',
                'quality_tier' => $tier,
                'status' => 'draft',
            ]);

            $renderer = app(StoryboardRenderer::class);
            $resolveModel = new ReflectionMethod($renderer, 'resolveModel');
            $resolveModel->setAccessible(true);

            $model = $resolveModel->invoke($renderer, $storyboard);
            $this->assertNotEmpty($model, "resolveModel must resolve a model for tier {$tier}");
        }
    }
}
