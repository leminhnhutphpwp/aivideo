<?php

return [
    // Fallback daily render cap for users without a plan. Plans normally set their own
    // limit via Plan::max_renders_per_day (null there = unlimited).
    'default_max_per_day' => (int) env('RENDER_DEFAULT_MAX_PER_DAY', 10),
];
