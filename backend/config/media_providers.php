<?php

return [
    'default_models' => [
        'text_to_video' => 'wan2.6-t2v',
        'image_to_video' => 'wan2.6-i2v',
        'reference_to_video' => 'wan2.7-r2v',
        'video_editing' => 'wan2.7-videoedit',
        'character_animation' => 'wan2.2-animate-move',
        'image_generation' => 'z-image-turbo',
        'image_editing' => 'wan2.5-i2i-preview',
        'image_multi_panel' => 'xah-wan2.7-image-pro',
        'tts' => 'tts-1',
        'sfx' => 'elevenlabs-sfx',
    ],
    'providers' => [
        'qwencloud' => [
            'label' => 'Qwen Cloud (Alibaba)',
            'default_base_url' => 'https://dashscope-intl.aliyuncs.com/api/v1',
            'api_key_env' => 'QWENCLOUD_API_KEY',
            'models' => [
                'z-image-turbo' => ['capabilities' => ['t2i'], 'cost_hint' => '$0.015/img'],
                'wan2.6-t2i' => ['capabilities' => ['t2i'], 'cost_hint' => '$0.03/img'],
                'qwen-image-max' => ['capabilities' => ['t2i'], 'cost_hint' => '$0.075/img'],
                'wan2.7-image-pro' => ['capabilities' => ['t2i'], 'cost_hint' => '$0.075/img'],
                'qwen-image-plus' => ['capabilities' => ['t2i', 'i2i'], 'cost_hint' => '$0.03/img'],
                'qwen-image-2.0' => ['capabilities' => ['t2i', 'i2i', 'inpaint'], 'cost_hint' => '$0.035/img'],
                'qwen-image-2.0-pro' => ['capabilities' => ['t2i', 'i2i', 'inpaint'], 'cost_hint' => '$0.075/img'],
                'qwen-image-edit-plus' => ['capabilities' => ['i2i', 'inpaint', 't2i'], 'cost_hint' => '$0.03/img'],
                'wan2.5-i2i-preview' => ['capabilities' => ['i2i', 'inpaint'], 'cost_hint' => '$0.03/img'],
                'qwen-image-edit' => ['capabilities' => ['i2i', 'inpaint'], 'cost_hint' => '$0.03/img'],
                'qwen-image-edit-max' => ['capabilities' => ['i2i', 'inpaint'], 'cost_hint' => '$0.075/img'],
                'wan2.6-t2v' => ['capabilities' => ['t2v', 'audio'], 'cost_hint' => '$0.07/s'],
                'wan2.6-i2v' => ['capabilities' => ['i2v', 'audio'], 'cost_hint' => '$0.07/s'],
                'wan2.6-r2v' => ['capabilities' => ['r2v', 'audio'], 'cost_hint' => '$0.07/s'],
                'wan2.7-t2v-2026-04-25' => ['capabilities' => ['t2v', 'audio'], 'cost_hint' => '$0.10/s'],
                'wan2.7-i2v-2026-04-25' => ['capabilities' => ['i2v', 'audio'], 'cost_hint' => '$0.10/s'],
                'wan2.7-r2v' => ['capabilities' => ['r2v', 'audio'], 'cost_hint' => '$0.10/s'],
                'wan2.7-videoedit' => ['capabilities' => ['video-edit'], 'cost_hint' => '$0.10/s'],
                'happyhorse-1.0-t2v' => ['capabilities' => ['t2v', 'audio'], 'cost_hint' => '$0.10+/s'],
                'happyhorse-1.0-i2v' => ['capabilities' => ['i2v', 'audio'], 'cost_hint' => '$0.10+/s'],
                'happyhorse-1.0-video-edit' => ['capabilities' => ['video-edit'], 'cost_hint' => '$0.10+/s'],
                'happyhorse-1.0-r2v' => ['capabilities' => ['r2v', 'audio'], 'cost_hint' => '$0.10+/s'],
                'wan2.1-vace-plus' => ['capabilities' => ['t2v', 'i2v'], 'cost_hint' => '$0.10/s'],
                'wan2.2-animate-move' => ['capabilities' => ['character-anim'], 'cost_hint' => '$0.10/s'],
                'wan2.2-animate-mix' => ['capabilities' => ['character-anim'], 'cost_hint' => '$0.10/s'],
            ]
        ],
        'ckey' => [
            'label' => 'CKey (TTS & LLM)',
            'default_base_url' => 'https://ckey.vn/v1',
            'api_key_env' => 'CKEY_API_KEY',
            'models' => [
                'thanhnhan9023/gpt-image-2' => ['cost_hint' => '$0.02/img', 'capabilities' => ['image_generation']],
                'tts-1' => ['cost_hint' => '$0.015/1k', 'capabilities' => ['tts']],
            ]
        ],
        'elevenlabs' => [
            'label' => 'ElevenLabs (TTS + SFX)',
            'default_base_url' => 'https://api.elevenlabs.io',
            'api_key_env' => 'ELEVENLABS_API_KEY',
            'models' => [
                'elevenlabs-v3' => ['cost_hint' => '$0.03/1k', 'capabilities' => ['tts']],
                'elevenlabs-sfx' => ['cost_hint' => '$0.05/req', 'capabilities' => ['sfx']],
            ]
        ],
        'cloudflare' => [
            'label' => 'Cloudflare Workers AI',
            'default_base_url' => 'https://image-generation.minhnhut1999nb.workers.dev',
            'api_key_env' => 'CLOUDFLARE_API_KEY',
            'models' => [
                'cf-sdxl-lightning' => ['cost_hint' => '$0.01/img', 'capabilities' => ['image_generation']],
                'cf-sd-img2img' => ['cost_hint' => '$0.01/img', 'capabilities' => ['image_editing']],
                'cf-dreamshaper' => ['cost_hint' => '$0.01/img', 'capabilities' => ['image_generation']],
                'cf-flux-2-klein' => ['cost_hint' => '$0.015/img', 'capabilities' => ['image_generation']],
                'cf-phoenix-1.0' => ['cost_hint' => '$0.026/img', 'capabilities' => ['image_generation']],
                'cf-lucid-origin' => ['cost_hint' => '$0.031/img', 'capabilities' => ['image_generation']],
            ]
        ],
        'openai' => [
            'label' => 'OpenAI-compatible (xah.io)',
            'default_base_url' => 'https://api.xah.io/v1',
            'api_key_env' => 'OPENAI_API_KEY',
            'models' => [
                // Wan2.7 Image — text-to-image only (không có /images/edits → edit bị guard chặn 422).
                // cost_hint chờ bảng giá xah.io thật để chốt unit economics (WS1.2).
                'wan2.7-image' => ['capabilities' => ['t2i'], 'cost_hint' => 'TBD (xah.io)'],
                // Pro variant (wireModel phuocanh421994/Wan2.7_Image_Pro) — used for the
                // storyboard multi-panel sheet: higher quality + thinking_mode. qwencloud's
                // wan2.7-image-pro quota is exhausted, so multi-panel routes here instead.
                'xah-wan2.7-image-pro' => ['capabilities' => ['t2i'], 'cost_hint' => 'TBD (xah.io Pro)'],
            ]
        ],
        'stub' => [
            'label' => 'Stub (Thử nghiệm)',
            'default_base_url' => '',
            'api_key_env' => '',
            'models' => [
                'stub-video' => ['cost_hint' => 'Free', 'capabilities' => ['text_to_video', 'image_to_video']],
                'stub-image' => ['cost_hint' => 'Free', 'capabilities' => ['image_generation', 'image_editing']],
                'stub-audio' => ['cost_hint' => 'Free', 'capabilities' => ['tts', 'sfx']],
            ]
        ],
    ]
];
