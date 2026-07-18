<?php

return [
    // Max total render attempts (initial render + retries) per storyboard. Caps
    // unlimited retries on a failing storyboard. Retries that fail at the start
    // (e.g. prompt compile) refund credits, so without this cap they could be
    // retried for free indefinitely — wasting daemon/provider resources.
    'max_render_attempts' => (int) env('STORYBOARD_MAX_RENDER_ATTEMPTS', 5),

    // Feature flag — "Ghép cảnh" (multi_scene render mode). Temporarily DISABLED for the
    // initial launch (focus = One-Shot `single_flow` + Multi-Panel `storyboard_image`).
    //
    // While false, the backend rejects creating / updating / rendering any storyboard with
    // render_mode = 'multi_scene' (StoryboardController::multiSceneEnabled()), and the builder
    // UI shows the toggle as "Sắp ra mắt" (disabled).
    //
    // ▶ To RE-ENABLE: set STORYBOARD_MULTI_SCENE_ENABLED=true in .env (backend) AND flip
    //   MULTI_SCENE_ENABLED → true in apps/web .../flow/shared/constants.ts (frontend toggle).
    //   See worklog 2026-06-23-disable-multi-scene.md for the full re-enable checklist.
    'multi_scene_enabled' => (bool) env('STORYBOARD_MULTI_SCENE_ENABLED', false),
];
