@extends('layouts.app')

@section('title', 'Chi tiết video')

@section('content')
<div class="max-w-4xl mx-auto">
    <a href="{{ route('videos.index') }}" class="inline-flex items-center text-sm text-[#94A3B8] hover:text-white mb-6 transition">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        Quay lại
    </a>

    <div class="bg-[#1A1A2E] rounded-xl border border-gray-800 overflow-hidden">
        {{-- Player --}}
        <div class="aspect-video bg-black flex items-center justify-center">
            @if($job->status === 'completed' && $job->assets->where('type', 'video')->first())
                <video controls class="w-full h-full" autoplay>
                    <source src="{{ $job->assets->where('type', 'video')->first()->signedUrl() }}" type="video/mp4">
                </video>
            @elseif($job->status === 'failed')
                <div class="text-center text-red-400">
                    <div class="text-4xl mb-2">❌</div>
                    <div class="text-sm">Video generation thất bại</div>
                    @if($job->error_message)<div class="text-xs text-[#94A3B8] mt-1">{{ $job->error_message }}</div>@endif
                </div>
            @else
                <div class="text-center">
                    <div class="text-4xl mb-2 animate-pulse">⏳</div>
                    <div class="text-sm text-[#94A3B8]">Đang xử lý...</div>
                </div>
            @endif
        </div>

        {{-- Info --}}
        <div class="p-6 space-y-4">
            <h2 class="text-lg font-bold">Chi tiết</h2>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><span class="text-[#94A3B8]">Prompt:</span> <span class="block mt-0.5">{{ $job->prompt }}</span></div>
                <div><span class="text-[#94A3B8]">Model:</span> <span class="block mt-0.5">{{ $job->model }}</span></div>
                <div><span class="text-[#94A3B8]">Thời lượng:</span> <span class="block mt-0.5">{{ $job->duration_seconds }}s</span></div>
                <div><span class="text-[#94A3B8]">Độ phân giải:</span> <span class="block mt-0.5">{{ $job->resolution }}</span></div>
                <div><span class="text-[#94A3B8]">Credits:</span> <span class="block mt-0.5">{{ $job->credits_cost }}</span></div>
                <div><span class="text-[#94A3B8]">Trạng thái:</span> <span class="block mt-0.5">{{ $job->status === 'completed' ? 'Hoàn thành' : ($job->status === 'failed' ? 'Thất bại' : $job->status) }}</span></div>
                @if($job->completed_at)<div><span class="text-[#94A3B8]">Hoàn thành:</span> <span class="block mt-0.5">{{ $job->completed_at->format('d/m/Y H:i') }}</span></div>@endif
                @if($job->gpu_seconds)<div><span class="text-[#94A3B8]">GPU time:</span> <span class="block mt-0.5">{{ $job->gpu_seconds }}s</span></div>@endif
            </div>

            {{-- Actions --}}
            <div class="flex gap-3 pt-4 border-t border-gray-800">
                @if($job->status === 'completed')
                    <a href="{{ $job->assets->where('type', 'video')->first()?->signedUrl() }}" download class="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-medium transition">
                        ⬇ Tải xuống
                    </a>
                    <a href="{{ route('studio') }}" class="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition">
                        🎨 Tạo tương tự
                    </a>
                @endif
                @if($job->isRetryable())
                <form action="{{ route('videos.retry', $job->uuid) }}" method="POST" class="inline">
                    @csrf
                    <button class="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition">
                        🔄 Thử lại
                    </button>
                </form>
                @endif
                @if(!$job->isTerminal())
                <form action="{{ route('videos.cancel', $job->uuid) }}" method="POST" class="inline">
                    @csrf
                    <button class="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition">
                        ✕ Huỷ
                    </button>
                </form>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection
