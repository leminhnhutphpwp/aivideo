<?php

return [
    'base_url' => env('DAEMON_URL', 'http://localhost:7456'),
    'callback_url' => env('DAEMON_CALLBACK_URL', 'http://localhost:8000/api/daemon/webhook'),
    'webhook_secret' => env('DAEMON_WEBHOOK_SECRET'),
    'timeout' => env('DAEMON_TIMEOUT', 30),
    'project_id' => env('DAEMON_PROJECT_ID', 'aivideo-platform'),
    'max_projects_per_user' => env('DAEMON_MAX_PROJECTS_PER_USER', 50),
    'default_model' => env('DAEMON_DEFAULT_MODEL', 'seedance'),

    // Max total attempts (initial generate + retries) per daemon project. Caps
    // unlimited free retries on a failing project (credits refund on failure).
    'max_attempts_per_project' => env('DAEMON_MAX_ATTEMPTS_PER_PROJECT', 5),

    // Local skills directory (apps/skills), mounted into this container at /skills.
    // Managed by App\Services\SkillService for the admin Skills editor.
    'skills_path' => env('SKILLS_PATH', '/skills'),

    'credit_matrix' => [
        '720p'  => ['per_second' => env('CREDIT_720P_PER_SEC', 1000), 'min_cost' => env('CREDIT_720P_MIN', 5000)],
        '1080p' => ['per_second' => env('CREDIT_1080P_PER_SEC', 2000), 'min_cost' => env('CREDIT_1080P_MIN', 10000)],
        '4K'    => ['per_second' => env('CREDIT_4K_PER_SEC', 4000), 'min_cost' => env('CREDIT_4K_MIN', 20000)],
    ],

    // Image: flat fee per generation (not per-second)
    'credit_image' => env('CREDIT_IMAGE', 2000),
    'credit_image_edit' => env('CREDIT_IMAGE_EDIT', 3000),

    'voice_over_surcharge' => env('VOICE_OVER_SURCHARGE', 3000),

    // Self-evolving skill library ("learning loop"). skills:refresh-examples rewrites a
    // skill's example_prompt toward the prompt of its most-liked published asset, but only
    // once that asset clears this like threshold — so examples evolve on real success, not noise.
    'skill_learning' => [
        'min_likes' => env('SKILL_LEARNING_MIN_LIKES', 3),
    ],
];
