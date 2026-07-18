<?php

return [
    'ttl' => [
        App\Models\User::class => 30,
        App\Models\Storyboard::class => 30,
        App\Models\StoryboardScene::class => 30,
        App\Models\StoryboardReference::class => 30,
        App\Models\RenderJob::class => 30,
        App\Models\Asset::class => 30,
    ],

    'batch_size' => 100,

    'log_channel' => null,
];
