@extends('layouts.app')

@section('title', 'Video Studio')

@section('content')
<div class="max-w-4xl mx-auto" x-data="videoStudio()">
    <div class="mb-8">
        <h1 class="text-2xl font-bold">Video Studio</h1>
        <p class="text-[#94A3B8] mt-1">Mô tả video bạn muốn tạo, AI sẽ làm phần còn lại</p>
    </div>

    {{-- Form --}}
    <div class="bg-[#1A1A2E] rounded-xl border border-gray-800 p-6 space-y-6">
        {{-- Prompt --}}
        <div>
            <label class="block text-sm font-medium mb-2">Mô tả video</label>
            <textarea x-model="form.prompt" rows="4" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-4 py-3 text-sm focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] outline-none resize-none" placeholder="Ví dụ: Một cảnh quay cinematic về thành phố tương lai với ánh đèn neon, mưa, phong cách cyberpunk..."></textarea>
            <div class="text-right text-xs text-[#94A3B8] mt-1" x-text="form.prompt.length + '/2000'"></div>
        </div>

        {{-- Parameters --}}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
                <label class="block text-sm font-medium mb-2">Model</label>
                <select x-model="form.model" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-[#7C3AED] outline-none">
                    <option value="seedance">Seedance</option>
                    <option value="runway">Runway</option>
                    <option value="pika">Pika</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Thời lượng</label>
                    <select x-model="form.duration" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-[#7C3AED] outline-none">
                        <option value="5">5 giây</option>
                        <option value="10">10 giây</option>
                        <option value="15">15 giây</option>
                        <option value="30">30 giây</option>
                        <option value="60">60 giây</option>
                    </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Tỷ lệ</label>
                <select x-model="form.aspect_ratio" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-[#7C3AED] outline-none">
                    <option value="16:9">16:9 (Ngang)</option>
                    <option value="9:16">9:16 (Dọc)</option>
                    <option value="1:1">1:1 (Vuông)</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Phong cách</label>
                <select x-model="form.style" class="w-full bg-[#0A0A0F] border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:border-[#7C3AED] outline-none">
                    <option value="cinematic">Cinematic</option>
                    <option value="anime">Anime</option>
                    <option value="realistic">Realistic</option>
                    <option value="3d-render">3D Render</option>
                </select>
            </div>
        </div>

        {{-- Cost & Generate --}}
        <div class="flex items-center justify-between pt-4 border-t border-gray-800">
            <div>
                <span class="text-sm text-[#94A3B8]">Chi phí ước tính: </span>
                <span class="font-bold text-[#7C3AED]" x-text="estimatedCost + ' credits'"></span>
            </div>
            <button @click="generate()" :disabled="loading || !form.prompt.trim()" class="px-6 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-sm transition">
                <span x-show="!loading">🚀 Tạo video</span>
                <span x-show="loading">⏳ Đang tạo...</span>
            </button>
        </div>
    </div>

    {{-- Result --}}
    <div x-show="result" x-cloak class="mt-8 bg-[#1A1A2E] rounded-xl border border-gray-800 p-6">
        <h2 class="text-lg font-bold mb-4">Kết quả</h2>
        <div x-html="result" class="space-y-4"></div>
    </div>

    {{-- Error --}}
    <div x-show="error" x-cloak class="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm" x-text="error"></div>
</div>

@push('scripts')
<script>
function videoStudio() {
    return {
        form: {
            prompt: '',
            model: 'seedance',
            duration: 5,
            aspect_ratio: '16:9',
            resolution: '720p',
            style: 'cinematic',
        },
        loading: false,
        result: '',
        error: '',
        get estimatedCost() {
            const rates = { '720p': 10, '1080p': 20 };
            const rate = rates[this.form.resolution] || 10;
            return Math.max(50, this.form.duration * rate);
        },
        async generate() {
            this.loading = true;
            this.error = '';
            this.result = '';
            try {
                const res = await fetch('/api/render-jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{ session("jwt_token") }}' },
                    body: JSON.stringify(this.form),
                });
                const data = await res.json();
                if (!res.ok) {
                    this.error = data.message || data.error || 'Có lỗi xảy ra';
                    return;
                }
                this.result = `<p class="text-green-400">✅ Video đang được tạo! <a href="/videos/${data.uuid}" class="underline">Xem chi tiết</a></p>`;
                // Refresh credit display
                const creditRes = await fetch('/api/credits/balance', {
                    headers: { 'Authorization': 'Bearer {{ session("jwt_token") }}' }
                });
                const creditData = await creditRes.json();
                document.getElementById('credit-display').textContent = creditData.balance?.toLocaleString() || '0';
            } catch (e) {
                this.error = 'Không thể kết nối đến server';
            } finally {
                this.loading = false;
            }
        }
    }
}
</script>
@endpush
@endsection
