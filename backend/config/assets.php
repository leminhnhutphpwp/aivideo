<?php

return [
    // === User-uploaded assets (manual upload) ===
    // Max number of user-uploaded assets
    'max_count_per_user' => env('ASSETS_MAX_COUNT_PER_USER', 100),

    // Max total size of user-uploaded assets in MB
    'max_total_size_mb' => env('ASSETS_MAX_TOTAL_SIZE_MB', 500),

    // Single file max upload size in KB (20MB)
    'max_file_size_kb' => env('ASSETS_MAX_FILE_SIZE_KB', 20480),

    // === AI-generated assets (auto from jobs) ===
    // Generous limit — credit cost is the primary limiter
    'max_ai_generated_count' => env('ASSETS_MAX_AI_GENERATED_COUNT', 2000),

    // AI-generated assets auto-expire after N days (0 = never)
    'ai_generated_expire_days' => env('ASSETS_AI_EXPIRE_DAYS', 365),

    // === Image preview derivative (feed / thumbnails) ===
    // AI image outputs are large PNGs (6-9MB @ 2048-2560px). We generate a
    // web-optimized WebP derivative for the community feed / preview grid to cut
    // R2 egress + storage while keeping the original for download. See GenerateThumbnail.
    'image_preview' => [
        // Longest edge (px) of the derivative — downscale-only, never upscales.
        'max_dimension' => (int) env('ASSETS_IMAGE_PREVIEW_MAX_DIM', 1280),
        // libwebp quality (0-100). ~80 is a good size/quality balance for feeds.
        'quality' => (int) env('ASSETS_IMAGE_PREVIEW_QUALITY', 80),
    ],
];

