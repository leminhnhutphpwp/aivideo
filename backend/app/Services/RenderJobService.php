<?php
namespace App\Services;

use App\Exceptions\ValidationResult;
use App\Http\Requests\CreateRenderJobRequest;
use App\Models\RenderJob;
use App\Models\User;
use App\Services\DaemonClient;
use App\Services\ModelSelector;
use Illuminate\Support\Str;

class RenderJobService
{
    public function __construct(
        protected CreditCalculator $creditCalculator,
        protected DaemonClient $daemonClient,
        protected ModelSelector $modelSelector,
    ) {}

    public function validateCanGenerate(User $user, CreateRenderJobRequest $request): ValidationResult
    {
        $plan = $user->plan;
        $errors = [];

        $videoType = $request->input('video_type') ?: 'text_to_video';
        $model = $this->modelSelector->resolve($plan, $videoType);

        if (!$this->daemonClient->health()) {
            $errors[] = 'Hệ thống AI video đang bảo trì, vui lòng thử lại sau.';
        } elseif (!$this->daemonClient->isModelAvailable($model)) {
            $errors[] = 'Model AI hiện không khả dụng, vui lòng thử lại sau hoặc liên hệ admin.';
        }

        $activeJobs = $user->renderJobs()
            ->whereIn('status', ['queued', 'processing'])
            ->count();
        if ($activeJobs >= $plan->max_concurrent_jobs) {
            $errors[] = "You have {$activeJobs} active jobs, max is {$plan->max_concurrent_jobs}";
        }

        return new ValidationResult(empty($errors), $errors);
    }

    public function calculateCost(int $duration, string $resolution): int
    {
        return $this->creditCalculator->calculate($duration, $resolution);
    }

    public function createJob(User $user, CreateRenderJobRequest $request, int $cost): RenderJob
    {
        $videoType = $request->input('video_type') ?: 'text_to_video';
        $plan = $user->plan;
        $qualityTier = $plan->getQualityTierCode();
        $model = $this->modelSelector->resolve($plan, $videoType);

        $job = RenderJob::create([
            'uuid' => Str::uuid(),
            'user_id' => $user->id,
            'status' => 'created',
            'prompt' => $request->prompt,
            'negative_prompt' => $request->input('negative_prompt'),
            'title' => $this->generateTitle($request->prompt),
            'model' => $model,
            'quality_tier' => $qualityTier,
            'video_type' => $videoType,
            'duration_seconds' => $request->duration_seconds,
            'aspect_ratio' => $request->aspect_ratio ?? '16:9',
            'resolution' => $request->resolution ?? '720p',
            'parameters' => $request->parameters,
            'reference_images' => $request->reference_images,
            'credits_cost' => $cost,
            'plan_snapshot' => $user->plan->toSnapshot(),
        ]);

        activity()
            ->performedOn($job)
            ->causedBy($user)
            ->withProperties([
                'model' => $job->model,
                'quality_tier' => $job->quality_tier,
                'video_type' => $job->video_type,
                'duration' => $job->duration_seconds,
                'resolution' => $job->resolution,
                'cost' => $cost,
            ])
            ->log('job_created');

        return $job;
    }

    protected function generateTitle(string $prompt): string
    {
        $title = preg_replace('/\s+/', ' ', trim($prompt));
        if (mb_strlen($title) <= 100) return $title;
        return mb_substr($title, 0, 97) . '...';
    }

}
