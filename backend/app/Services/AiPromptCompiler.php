<?php

namespace App\Services;

use App\Models\Storyboard;
use App\Support\LlmConfigResolver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AiPromptCompiler
{
    protected string $baseUrl;
    protected string $apiKey;
    protected string $model;

    public function __construct()
    {
        // Use the SAME admin-managed AI config as ai-draft / the prompt enhancer
        // (AiSettings → LlmConfigResolver). This is the OpenAI-compatible branch
        // (ckey/openai/custom). Falls back to the daemon-style .env config only when
        // the admin provider is 'env'. Without this, compile silently used an empty
        // CKEY_API_KEY → "Failed to compile prompt" even after the admin set a key.
        $override = LlmConfigResolver::resolve();
        if ($override && ! empty($override['apiKey'])) {
            $this->baseUrl = rtrim(($override['baseUrl'] ?: 'https://ckey.vn'), '/');
            $this->apiKey = $override['apiKey'];
            $this->model = $override['model'] ?: 'gpt-4o-mini';
        } else {
            // config()'s 2nd-arg default only applies when the key is absent, not
            // present-but-null — use ?? so these typed strings never receive null.
            $this->baseUrl = rtrim(config('services.llm.base_url') ?? 'https://ckey.vn', '/');
            $this->apiKey = config('services.llm.api_key') ?? '';
            $this->model = config('services.llm.model') ?? 'gpt-4o-mini';
        }
    }

    protected function isSimulationMode(): bool
    {
        if (env('SIMULATION_MODE', false)) {
            return true;
        }

        try {
            $response = Http::timeout(3)->get(config('daemon.base_url') . '/api/media/simulation');
            $config = $response->json();
            return $config['enabled'] ?? false;
        } catch (\Throwable) {
            return false;
        }
    }

    public function compile(Storyboard $storyboard): string
    {
        $scenes = $storyboard->scenes()->orderBy('scene_number')->get();

        if ($scenes->isEmpty()) {
            throw new \RuntimeException('Storyboard has no scenes to compile');
        }

        // Simulation mode: return fake prompt instead of calling real API
        if ($this->isSimulationMode()) {
            return $this->fakeCompiledPrompt($storyboard, $scenes);
        }

        $systemPrompt = $this->buildSystemPrompt($storyboard, $scenes);
        $userContent = $this->buildUserContent($storyboard, $scenes);

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Content-Type' => 'application/json',
            ])->timeout(120)->post("{$this->baseUrl}/v1/chat/completions", [
                'model' => $this->model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userContent],
                ],
                'temperature' => 0.7,
                'max_tokens' => 8192,
            ]);

            if (!$response->successful()) {
                $body = $response->json();
                $msg = $body['error']['message'] ?? 'LLM API error';
                Log::error('AiPromptCompiler: LLM call failed', [
                    'status' => $response->status(),
                    'error' => $msg,
                ]);
                throw new \RuntimeException($msg);
            }

            $content = $response->json('choices.0.message.content', '');
            if (empty(trim($content))) {
                throw new \RuntimeException('LLM returned empty response');
            }

            return trim($content);
        } catch (\RuntimeException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('AiPromptCompiler: connection failed', ['error' => $e->getMessage()]);
            throw new \RuntimeException('Không thể kết nối đến AI biên dịch prompt');
        }
    }

    protected function buildSystemPrompt(Storyboard $storyboard, $scenes): string
    {
        return "You are a professional cinematic screenwriter. Your task is to write ONE continuous narrative for an AI-generated video.

IMPORTANT:
- Write it as ONE single, continuous paragraph with no breaks.
- ABSOLUTELY DO NOT use phrases like \"Scene 1\", \"Scene 2\", \"Cảnh 1\", \"Cảnh 2\".
- Weave all elements (camera angle, lighting, style, mood, narration) naturally into the flow of the story.
- Describe camera movement as part of the action (e.g. \"the camera slowly zooms in on her face as she realizes the truth\").
- Blend lighting and mood into the scene description (e.g. \"under cold purple neon light, a tense atmosphere fills the room\").
- Write in ENGLISH (video generation models follow English best).
- Length: appropriate for a total video duration of about {$scenes->sum('duration_seconds')} seconds.
- Return ONLY the compiled prompt content, with no extra preamble.";
    }

    protected function buildUserContent(Storyboard $storyboard, $scenes): string
    {
        $parts = [];
        $parts[] = "TITLE: {$storyboard->title}";
        if ($storyboard->description) {
            $parts[] = "DESCRIPTION: {$storyboard->description}";
        }

        if ($storyboard->render_mode === 'single_flow') {
            $parts[] = "\n--- GLOBAL STYLE GUIDE (APPLIES TO THE WHOLE VIDEO) ---";
            if ($storyboard->camera_movement) {
                $parts[] = "Camera: {$storyboard->camera_movement}";
            }
            if ($storyboard->style) {
                $parts[] = "Style: {$storyboard->style}";
            }
            if ($storyboard->mood) {
                $parts[] = "Mood: {$storyboard->mood}";
            }
            if ($storyboard->lighting) {
                $parts[] = "Lighting: {$storyboard->lighting}";
            }
            if ($storyboard->narration) {
                $parts[] = "Narration: {$storyboard->narration}";
            }
        }

        if ($storyboard->shot_type === 'multi' && $storyboard->multi_panel_image) {
            $parts[] = "\nA multi-panel storyboard image has been provided as a reference. The prompt should describe the action and camera movement of each panel in order.";
        }

        $parts[] = "\nSCENE LIST (in order):\n";

        foreach ($scenes as $i => $scene) {
            $n = $i + 1;
            $parts[] = "--- Scene {$n} ---";
            $parts[] = "Prompt: {$scene->prompt}";
            if ($scene->camera_movement) {
                $parts[] = "Camera movement: {$scene->camera_movement}";
            }
            if ($scene->style) {
                $parts[] = "Style: {$scene->style}";
            }
            if ($scene->mood) {
                $parts[] = "Mood: {$scene->mood}";
            }
            if ($scene->lighting) {
                $parts[] = "Lighting: {$scene->lighting}";
            }
            if ($scene->edge_label) {
                $parts[] = "Transition: {$scene->edge_label}";
            }
            if ($scene->narration) {
                $parts[] = "Narration: {$scene->narration}";
            }
            if ($scene->duration_seconds) {
                $parts[] = "Duration: {$scene->duration_seconds}s";
            }
        }

        $voiceNote = '';
        if ($storyboard->voice) {
            $voiceNote = "\nThe video has a voiceover: {$storyboard->voice}.";
        }
        if ($storyboard->voice_mood) {
            $voiceNote .= " Voice tone: {$storyboard->voice_mood}.";
        }

        $parts[] = "\nWrite ONE single continuous video description that combines all the scenes above into one continuous cinematic story, without numbering the scenes." . $voiceNote;

        return implode("\n", $parts);
    }

    /**
     * Compile scenes into a prompt for multi-panel image generation.
     * Returns a prompt that describes a comic-strip-style layout image showing all scenes.
     */
    public function compileForImage(Storyboard $storyboard): string
    {
        $scenes = $storyboard->scenes()->orderBy('scene_number')->get();

        if ($scenes->isEmpty()) {
            throw new \RuntimeException('Storyboard has no scenes to compile');
        }

        $sceneCount = $scenes->count();
        $styleLine = $storyboard->style ?: 'photorealistic cinematic (default when the project has no chosen style)';

        // Steering prompt is ENGLISH (models follow it better); only the user's own input
        // (title, description, scene prompts) is embedded verbatim.
        $parts = [];
        $parts[] = "You are a film image director. Task: write ONE image-generation prompt (in ENGLISH) describing a SINGLE multi-panel grid image, where EACH panel is a keyframe of one scene — used as a REFERENCE for AI video generation. The visual style / setting / characters of the panels MUST follow the project's style (see STYLE GUIDE below): a realistic project -> realistic panels; an anime/cartoon project -> anime/cartoon panels; oil painting / cyberpunk / etc. -> that exact style. This is NOT a 'storyboard sketch with notes' — it is a set of finished, polished frames in the project's style.";
        $parts[] = "";
        $parts[] = "TITLE: {$storyboard->title}";
        if ($storyboard->description) {
            $parts[] = "DESCRIPTION: {$storyboard->description}";
        }
        $parts[] = "";
        $parts[] = "LAYOUT REQUIREMENTS:";
        $parts[] = "- A single image divided into EXACTLY {$sceneCount} panels (equal to the number of scenes), in time order left-to-right, top-to-bottom, separated by thin gutters.";
        $parts[] = "- Each panel is a high-quality keyframe of one scene.";
        $parts[] = "- Style / setting / characters / color palette CONSISTENT across all panels, following the project style (STYLE GUIDE). Do NOT switch styles between panels.";
        $parts[] = "- ABSOLUTELY NO: text, numbers, labels, captions, technical notes, logos, titles, panel numbers, framed borders with text. Image only.";
        $parts[] = "- Reason (no text + keep style): this image is a reference for AI video generation -> any text gets baked into the video, and the image's style dictates the video's style (realistic image -> realistic video, anime -> anime video).";
        $parts[] = "";

        if ($storyboard->render_mode === 'single_flow' || $storyboard->render_mode === 'storyboard_image') {
            $parts[] = "STYLE GUIDE (MANDATORY for every panel, keep consistent):";
            $parts[] = "- Visual style: {$styleLine}";
            if ($storyboard->camera_movement) $parts[] = "- Camera: {$storyboard->camera_movement}";
            if ($storyboard->mood) $parts[] = "- Mood: {$storyboard->mood}";
            if ($storyboard->lighting) $parts[] = "- Lighting: {$storyboard->lighting}";
            $parts[] = "";
        }

        $parts[] = "SCENE CONTENT (in order):";

        foreach ($scenes as $i => $scene) {
            $n = $i + 1;
            $parts[] = "";
            $parts[] = "Panel {$n}:";
            $parts[] = "- Description: {$scene->prompt}";
            if ($scene->duration_seconds) {
                $parts[] = "- Duration: {$scene->duration_seconds}s";
            }
            if ($scene->camera_movement) {
                $parts[] = "- Camera: {$scene->camera_movement}";
            }
        }

        $parts[] = "";
        $parts[] = "Write ONE single image-generation prompt (in ENGLISH) describing this multi-panel image. Include: the grid layout of EXACTLY {$sceneCount} panels, a description of each panel as a keyframe, and a CONSISTENT style / setting following the project style in the STYLE GUIDE (do NOT change to another style). End the prompt with the emphasis: 'no text, no numbers, no labels; keep the {$styleLine} style consistent across all panels'. Do NOT use words like 'panel 1', 'panel 2' in the final prompt — describe it as one flowing prompt.";

        if ($storyboard->multi_panel_image) {
            $parts[] = "\nNOTE: You may use the current multi-panel image ({$storyboard->multi_panel_image}) as a style reference if helpful.";
        }

        return implode("\n", $parts);
    }

    protected function fakeCompiledPrompt(Storyboard $storyboard, $scenes): string
    {
        $parts = [];
        $parts[] = "[SIMULATION] Đây là prompt đã biên dịch ở chế độ giả lập.";

        if ($storyboard->camera_movement) {
            $parts[] = "Góc máy: {$storyboard->camera_movement}.";
        }
        if ($storyboard->style) {
            $parts[] = "Phong cách: {$storyboard->style}.";
        }
        if ($storyboard->mood) {
            $parts[] = "Tâm trạng: {$storyboard->mood}.";
        }
        if ($storyboard->lighting) {
            $parts[] = "Ánh sáng: {$storyboard->lighting}.";
        }

        foreach ($scenes as $i => $scene) {
            $parts[] = "({$scene->prompt})";
        }

        $parts[] = "Tổng thời lượng: {$scenes->sum('duration_seconds')} giây.";

        return implode(' ', $parts);
    }
}
