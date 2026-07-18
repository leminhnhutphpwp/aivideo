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
        return "Bạn là một nhà biên kịch điện ảnh chuyên nghiệp. Nhiệm vụ của bạn là viết MỘT đoạn mô tả liền mạch (ONE continuous narrative) cho một video được tạo bởi AI.

QUAN TRỌNG:
- Viết thành MỘT đoạn văn duy nhất, liền mạch, không ngắt quãng.
- TUYỆT ĐỐI KHÔNG dùng các cụm như \"Cảnh 1\", \"Cảnh 2\", \"Scene 1\", \"Scene 2\".
- Tất cả các yếu tố (góc máy, ánh sáng, phong cách, tâm trạng, lời dẫn) phải được ĐAN XEN tự nhiên vào dòng chảy của câu chuyện.
- Mô tả chuyển động camera như một phần của hành động (vd: \"máy quay từ từ zoom cận vào khuôn mặt cô ấy khi cô ấy nhận ra sự thật\").
- Kết hợp ánh sáng và tâm trạng vào mô tả cảnh (vd: \"dưới ánh đèn neon tím lạnh lẽo, không khí căng thẳng bao trùm\").
- Viết bằng tiếng Việt.
- Độ dài: phù hợp với tổng thời lượng video khoảng {$scenes->sum('duration_seconds')} giây.
- Trả về CHỈ nội dung prompt đã biên dịch, không thêm bất kỳ lời dẫn nào khác.";
    }

    protected function buildUserContent(Storyboard $storyboard, $scenes): string
    {
        $parts = [];
        $parts[] = "TIÊU ĐỀ: {$storyboard->title}";
        if ($storyboard->description) {
            $parts[] = "MÔ TẢ: {$storyboard->description}";
        }

        if ($storyboard->render_mode === 'single_flow') {
            $parts[] = "\n--- HƯỚNG DẪN CHUNG (ÁP DỤNG TOÀN BỘ VIDEO) ---";
            if ($storyboard->camera_movement) {
                $parts[] = "Camera: {$storyboard->camera_movement}";
            }
            if ($storyboard->style) {
                $parts[] = "Phong cách: {$storyboard->style}";
            }
            if ($storyboard->mood) {
                $parts[] = "Tâm trạng: {$storyboard->mood}";
            }
            if ($storyboard->lighting) {
                $parts[] = "Ánh sáng: {$storyboard->lighting}";
            }
            if ($storyboard->narration) {
                $parts[] = "Lời dẫn: {$storyboard->narration}";
            }
        }

        if ($storyboard->shot_type === 'multi' && $storyboard->multi_panel_image) {
            $parts[] = "\nMột ảnh truyện tranh nhiều khung (multi-panel storyboard) đã được tải lên làm tài liệu tham khảo. Prompt nên mô tả hành động và chuyển động camera của từng khung theo trình tự.";
        }

        $parts[] = "\nDANH SÁCH CÁC PHÂN CẢNH (theo thứ tự):\n";

        foreach ($scenes as $i => $scene) {
            $n = $i + 1;
            $parts[] = "--- Phân cảnh {$n} ---";
            $parts[] = "Prompt: {$scene->prompt}";
            if ($scene->camera_movement) {
                $parts[] = "Chuyển động camera: {$scene->camera_movement}";
            }
            if ($scene->style) {
                $parts[] = "Phong cách: {$scene->style}";
            }
            if ($scene->mood) {
                $parts[] = "Tâm trạng: {$scene->mood}";
            }
            if ($scene->lighting) {
                $parts[] = "Ánh sáng: {$scene->lighting}";
            }
            if ($scene->edge_label) {
                $parts[] = "Chuyển tiếp: {$scene->edge_label}";
            }
            if ($scene->narration) {
                $parts[] = "Lời dẫn: {$scene->narration}";
            }
            if ($scene->duration_seconds) {
                $parts[] = "Thời lượng: {$scene->duration_seconds}s";
            }
        }

        $voiceNote = '';
        if ($storyboard->voice) {
            $voiceNote = "\nVideo có giọng đọc: {$storyboard->voice}.";
        }
        if ($storyboard->voice_mood) {
            $voiceNote .= " Tông giọng: {$storyboard->voice_mood}.";
        }

        $parts[] = "\nHãy viết MỘT đoạn mô tả video liền mạch duy nhất, kết hợp tất cả các phân cảnh trên thành một câu chuyện điện ảnh liên tục, không đánh số cảnh." . $voiceNote;

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
        $styleLine = $storyboard->style ?: 'điện ảnh chân thực (photorealistic cinematic) — mặc định khi project chưa chọn style';

        $parts = [];
        $parts[] = "Bạn là một đạo diễn hình ảnh. Nhiệm vụ: tạo MỘT prompt (tiếng Việt) mô tả MỘT bức ảnh bố cục nhiều khung (multi-panel grid), MỖI khung là một KHUNG HÌNH (keyframe) của một phân cảnh — dùng làm REFERENCE cho AI sinh VIDEO. Phong cách / bối cảnh / nhân vật của các khung PHẢI theo ĐÚNG style của project (xem HƯỚNG DẪN PHONG CÁCH bên dưới): project ảnh thật → khung ảnh thật; project anime/hoạt hình → khung anime/hoạt hình; oil painting / cyberpunk / v.v. → đúng style đó. Đây KHÔNG phải 'storyboard sketch có ghi chú' — mà là các khung hình thành phẩm đẹp, đúng phong cách project.";
        $parts[] = "";
        $parts[] = "TIÊU ĐỀ: {$storyboard->title}";
        if ($storyboard->description) {
            $parts[] = "MÔ TẢ: {$storyboard->description}";
        }
        $parts[] = "";
        $parts[] = "YÊU CẦU BỐ CỤC:";
        $parts[] = "- Bức ảnh duy nhất, chia thành ĐÚNG {$sceneCount} khung (bằng số phân cảnh), theo trình tự thời gian từ trái sang phải, trên xuống dưới, cách nhau bởi gutter mảnh.";
        $parts[] = "- Mỗi khung là một keyframe chất lượng cao của một phân cảnh.";
        $parts[] = "- Phong cách / bối cảnh / nhân vật / bảng màu NHẤT QUÁN xuyên suốt tất cả các khung, theo ĐÚNG style project (mục HƯỚNG DẪN PHONG CÁCH). KHÔNG tự đổi sang style khác giữa các khung.";
        $parts[] = "- TUYỆT ĐỐI KHÔNG: chữ, số, nhãn, caption, ghi chú kỹ thuật, logo, tiêu đề, số thứ tự khung, khung viền có chữ. Chỉ có HÌNH.";
        $parts[] = "- Lý do bỏ chữ + giữ đúng style: ảnh là reference cho AI sinh video → chữ sẽ bị 'vẽ' vào video, và style của ảnh quyết định style video (ảnh thật→video thật, anime→video anime).";
        $parts[] = "";

        if ($storyboard->render_mode === 'single_flow' || $storyboard->render_mode === 'storyboard_image') {
            $parts[] = "HƯỚNG DẪN PHONG CÁCH (BẮT BUỘC áp cho MỌI khung, giữ nhất quán):";
            $parts[] = "- Phong cách hình ảnh: {$styleLine}";
            if ($storyboard->camera_movement) $parts[] = "- Góc máy: {$storyboard->camera_movement}";
            if ($storyboard->mood) $parts[] = "- Tâm trạng: {$storyboard->mood}";
            if ($storyboard->lighting) $parts[] = "- Ánh sáng: {$storyboard->lighting}";
            $parts[] = "";
        }

        $parts[] = "NỘI DUNG TỪNG KHUNG (theo thứ tự):";

        foreach ($scenes as $i => $scene) {
            $n = $i + 1;
            $parts[] = "";
            $parts[] = "Khung {$n}:";
            $parts[] = "- Mô tả: {$scene->prompt}";
            if ($scene->duration_seconds) {
                $parts[] = "- Thời lượng: {$scene->duration_seconds}s";
            }
            if ($scene->camera_movement) {
                $parts[] = "- Góc máy: {$scene->camera_movement}";
            }
        }

        $parts[] = "";
        $parts[] = "Hãy viết MỘT prompt duy nhất (bằng tiếng Việt) mô tả bức ảnh multi-panel này cho AI image generation. Bao gồm: bố cục lưới ĐÚNG {$sceneCount} khung, mô tả từng khung như một keyframe, và phong cách / bối cảnh NHẤT QUÁN theo ĐÚNG style project ở mục HƯỚNG DẪN PHONG CÁCH (KHÔNG tự đổi thành style khác). Kết thúc prompt bằng cụm nhấn mạnh: 'KHÔNG chữ KHÔNG số KHÔNG nhãn, giữ nguyên phong cách {$styleLine} xuyên suốt tất cả các khung'. KHÔNG dùng từ 'khung 1', 'khung 2' trong prompt cuối — mô tả liền mạch.";

        if ($storyboard->multi_panel_image) {
            $parts[] = "\nLƯU Ý: Có thể dùng ảnh multi-panel hiện tại ({$storyboard->multi_panel_image}) làm style reference nếu muốn.";
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
