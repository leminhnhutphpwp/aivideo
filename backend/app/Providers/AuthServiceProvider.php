<?php
namespace App\Providers;

use App\Models\Asset;
use App\Models\ApiKey;
use App\Models\RenderJob;
use App\Models\Report;
use App\Models\Storyboard;
use App\Policies\AssetPolicy;
use App\Policies\ApiKeyPolicy;
use App\Policies\RenderJobPolicy;
use App\Policies\ReportPolicy;
use App\Policies\StoryboardPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        RenderJob::class => RenderJobPolicy::class,
        Asset::class => AssetPolicy::class,
        ApiKey::class => ApiKeyPolicy::class,
        Report::class => ReportPolicy::class,
        Storyboard::class => StoryboardPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}
