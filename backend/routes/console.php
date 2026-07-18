<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('activitylog:clean')->daily();
Schedule::command('credits:renew')->daily();
Schedule::command('credits:auto-renew')->daily();
Schedule::command('jobs:check-timeouts')->everyFiveMinutes();
Schedule::command('credits:release')->hourly();
Schedule::job(new \App\Jobs\ReleaseStuckCredits)->hourly();
Schedule::job(new \App\Jobs\CleanupExpiredAssets)->daily();
Schedule::job(new \App\Jobs\CheckExpiredSubscriptions)->dailyAt('06:00');
Schedule::command('assets:sync-to-r2')->dailyAt('03:00');
Schedule::command('trending:compute')->everyFifteenMinutes();
Schedule::command('reputation:compute')->everyFifteenMinutes();
Schedule::command('tags:update-counts')->everyFifteenMinutes();
Schedule::command('daemon:cleanup-orphans --min-age=1')->dailyAt('04:00');
Schedule::command('storyboards:check-timeouts')->everyFifteenMinutes();
Schedule::command('model:prune-trashed')->dailyAt('02:00');
// Skill self-improvement loop: flag outdated skill docs daily; discover trending
// gaps and author them as drafts weekly. Both are fail-open (never crash the scheduler).
Schedule::command('skills:check-staleness')->dailyAt('05:00');
Schedule::command('skills:discover')->weeklyOn(1, '05:30');
// "Learning" step: evolve skill example_prompts toward the most-liked community assets.
// Sunday 04:00 — offset from discover (Mon 05:30) and staleness (daily 05:00).
Schedule::command('skills:refresh-examples')->weeklyOn(0, '04:00');
