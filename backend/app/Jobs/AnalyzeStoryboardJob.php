<?php

namespace App\Jobs;

use App\Models\Storyboard;
use App\Services\StoryboardAnalyzer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class AnalyzeStoryboardJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected Storyboard $storyboard,
    ) {}

    public function handle(StoryboardAnalyzer $analyzer): void
    {
        try {
            Log::debug('AnalyzeStoryboardJob handle() started', ['storyboard_id' => $this->storyboard->id]);
            
            $this->storyboard->markAsAnalyzing();
            
            Log::debug('After markAsAnalyzing', ['status' => $this->storyboard->fresh()->status]);
            
            $analysis = $analyzer->analyzeStoryboard($this->storyboard);
            
            Log::debug('Analysis result', ['scenes' => count($analysis['scenes'])]);
            
            $this->storyboard->markAsAnalyzed($analysis);
            
            Log::debug('After markAsAnalyzed', ['status' => $this->storyboard->fresh()->status]);
            
            Log::info('Storyboard analyzed successfully', [
                'storyboard_id' => $this->storyboard->id,
                'consistency_score' => $analysis['consistency_report']['average_consistency'] ?? null,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to analyze storyboard in queue', [
                'storyboard_id' => $this->storyboard->id,
                'error' => $e->getMessage(),
            ]);
            
            $this->storyboard->markAsFailed($e->getMessage());
        }
    }
}