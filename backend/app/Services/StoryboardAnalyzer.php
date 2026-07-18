<?php

namespace App\Services;

use App\Models\Storyboard;
use App\Models\StoryboardScene;
use App\Models\StoryboardReference;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class StoryboardAnalyzer
{
    /**
     * Analyze a storyboard and enrich scene prompts with reference information
     */
    public function analyzeStoryboard(Storyboard $storyboard): array
    {
        // Check cache first
        $cacheKey = "storyboard_analysis_{$storyboard->id}";
        $cachedResult = Cache::get($cacheKey);
        
        if ($cachedResult !== null) {
            return $cachedResult;
        }

        $scenes = $storyboard->scenes()->orderBy('scene_number')->get();
        $references = $storyboard->references;

        // Group references by type for easier access
        $referenceGroups = $references->groupBy('type');

        $results = [
            'storyboard_id' => $storyboard->id,
            'analyzed_at' => now()->toIso8601String(),
            'scenes' => [],
            'consistency_report' => [],
        ];

        foreach ($scenes as $scene) {
            $sceneAnalysis = $this->analyzeScene($scene, $referenceGroups);
            $results['scenes'][] = $sceneAnalysis;

            // Update the scene with enriched prompt if analysis succeeded
            if (!empty($sceneAnalysis['enriched_prompt'])) {
                $scene->update([
                    'enriched_prompt' => $sceneAnalysis['enriched_prompt'],
                ]);
            }
        }

        // Generate overall consistency report
        $results['consistency_report'] = $this->generateConsistencyReport($results['scenes']);

        // Cache the result for 1 hour
        Cache::put($cacheKey, $results, 3600);

        return $results;
    }

    /**
     * Analyze a single scene and enrich its prompt with reference information
     */
    protected function analyzeScene(StoryboardScene $scene, $referenceGroups): array
    {
        $originalPrompt = $scene->prompt;
        $enrichedPrompt = $originalPrompt;

        // Add character references
        if ($referenceGroups->has('character')) {
            $characterDescriptions = $referenceGroups['character']->map(function ($ref) {
                return $ref->description;
            })->filter()->unique()->values();

            if ($characterDescriptions->isNotEmpty()) {
                $characterContext = 'Characters: ' . implode(', ', $characterDescriptions->all());
                $enrichedPrompt = $this->mergePromptWithContext($enrichedPrompt, $characterContext);
            }
        }

        // Add product references
        if ($referenceGroups->has('product')) {
            $productDescriptions = $referenceGroups['product']->map(function ($ref) {
                return $ref->description;
            })->filter()->unique()->values();

            if ($productDescriptions->isNotEmpty()) {
                $productContext = 'Products: ' . implode(', ', $productDescriptions->all());
                $enrichedPrompt = $this->mergePromptWithContext($enrichedPrompt, $productContext);
            }
        }

        // Add background references
        if ($referenceGroups->has('background')) {
            $backgroundDescriptions = $referenceGroups['background']->map(function ($ref) {
                return $ref->description;
            })->filter()->unique()->values();

            if ($backgroundDescriptions->isNotEmpty()) {
                $backgroundContext = 'Background/Setting: ' . implode(', ', $backgroundDescriptions->all());
                $enrichedPrompt = $this->mergePromptWithContext($enrichedPrompt, $backgroundContext);
            }
        }

        // Calculate consistency score (simplified for now)
        $consistencyScore = $this->calculateConsistencyScore($scene, $referenceGroups);

        return [
            'scene_id' => $scene->id,
            'scene_number' => $scene->scene_number,
            'original_prompt' => $originalPrompt,
            'enriched_prompt' => $enrichedPrompt,
            'consistency_score' => $consistencyScore,
            'references_used' => [
                'character' => $referenceGroups->has('character') ? $referenceGroups['character']->count() : 0,
                'product' => $referenceGroups->has('product') ? $referenceGroups['product']->count() : 0,
                'background' => $referenceGroups->has('background') ? $referenceGroups['background']->count() : 0,
            ],
        ];
    }

    /**
     * Merge prompt with additional context
     */
    protected function mergePromptWithContext(string $prompt, string $context): string
    {
        // Simple approach: append context to prompt
        // In a real implementation, we might use more sophisticated NLP techniques
        return trim($prompt . ' ' . $context);
    }

    /**
     * Calculate a consistency score for the scene based on references
     * This is a simplified version - in reality this would be more complex
     */
    protected function calculateConsistencyScore(StoryboardScene $scene, $referenceGroups): float
    {
        // Base score
        $score = 5.0;

        // Bonus for having references
        $totalReferences = 0;
        if ($referenceGroups->has('character')) {
            $totalReferences += $referenceGroups['character']->count();
        }
        if ($referenceGroups->has('product')) {
            $totalReferences += $referenceGroups['product']->count();
        }
        if ($referenceGroups->has('background')) {
            $totalReferences += $referenceGroups['background']->count();
        }

        // Add points for references (up to 5 points)
        $referenceBonus = min($totalReferences, 5);
        $score += $referenceBonus;

        // Ensure score is between 0 and 10
        return max(0, min(10, $score));
    }

    /**
     * Generate a consistency report for all scenes
     */
    protected function generateConsistencyReport(array $sceneAnalyses): array
    {
        if (empty($sceneAnalyses)) {
            return [];
        }

        $consistencyScores = array_column($sceneAnalyses, 'consistency_score');
        $avgConsistency = array_sum($consistencyScores) / count($consistencyScores);
        $minConsistency = min($consistencyScores);
        $maxConsistency = max($consistencyScores);

        // Identify scenes with low consistency (< 5)
        $lowConsistencyScenes = array_filter($sceneAnalyses, function ($scene) {
            return $scene['consistency_score'] < 5.0;
        });

        return [
            'average_consistency' => round($avgConsistency, 2),
            'min_consistency' => round($minConsistency, 2),
            'max_consistency' => round($maxConsistency, 2),
            'low_consistency_scenes_count' => count($lowConsistencyScenes),
            'low_consistency_scenes' => array_values(array_map(function ($scene) {
                return [
                    'scene_number' => $scene['scene_number'],
                    'consistency_score' => $scene['consistency_score'],
                ];
            }, $lowConsistencyScenes)),
            'recommendations' => $this->generateRecommendations($sceneAnalyses),
        ];
    }

    /**
     * Generate recommendations based on analysis
     */
    protected function generateRecommendations(array $sceneAnalyses): array
    {
        $recommendations = [];

        // Check for scenes without references
        $noReferenceScenes = array_filter($sceneAnalyses, function ($scene) {
            $totalRefs = $scene['references_used']['character'] +
                         $scene['references_used']['product'] +
                         $scene['references_used']['background'];
            return $totalRefs === 0;
        });

        if (!empty($noReferenceScenes)) {
            $recommendations[] = [
                'type' => 'missing_references',
                'message' => 'Some scenes lack character, product, or background references which may affect consistency.',
                'affected_scenes' => array_values(array_map(fn($scene) => $scene['scene_number'], $noReferenceScenes)),
            ];
        }

        // Check for low consistency scores
        $lowScoreScenes = array_filter($sceneAnalyses, function ($scene) {
            return $scene['consistency_score'] < 5.0;
        });

        if (!empty($lowScoreScenes)) {
            $recommendations[] = [
                'type' => 'low_consistency',
                'message' => 'Several scenes have low consistency scores. Consider adding more specific references.',
                'affected_scenes' => array_values(array_map(fn($scene) => $scene['scene_number'], $lowScoreScenes)),
            ];
        }

        // If no issues found
        if (empty($recommendations)) {
            $recommendations[] = [
                'type' => 'good',
                'message' => 'Storyboard shows good consistency across scenes.',
            ];
        }

        return $recommendations;
    }
    
    /**
     * Clear cache for a storyboard
     */
    public function clearCache(Storyboard $storyboard): void
    {
        $cacheKey = "storyboard_analysis_{$storyboard->id}";
        Cache::forget($cacheKey);
    }
}