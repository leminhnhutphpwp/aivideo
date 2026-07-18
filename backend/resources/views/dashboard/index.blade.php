@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="max-w-6xl mx-auto space-y-8">
    {{-- Header --}}
    <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-[#94A3B8] mt-1">Quản lý video và credits của bạn</p>
    </div>

    {{-- Stats --}}
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-[#1A1A2E] rounded-xl p-5 border border-gray-800">
            <div class="text-[#94A3B8] text-sm">Credits</div>
            <div class="text-2xl font-bold mt-1 text-[#7C3AED]">{{ number_format(auth()->user()->credits) }}</div>
        </div>
        <div class="bg-[#1A1A2E] rounded-xl p-5 border border-gray-800">
            <div class="text-[#94A3B8] text-sm">Video đã tạo</div>
            <div class="text-2xl font-bold mt-1">{{ $totalVideos }}</div>
        </div>
        <div class="bg-[#1A1A2E] rounded-xl p-5 border border-gray-800">
            <div class="text-[#94A3B8] text-sm">Gói hiện tại</div>
            <div class="text-2xl font-bold mt-1 capitalize">{{ auth()->user()->plan?->name ?? 'Free' }}</div>
        </div>
        <div class="bg-[#1A1A2E] rounded-xl p-5 border border-gray-800">
            <div class="text-[#94A3B8] text-sm">Credits đã dùng</div>
            <div class="text-2xl font-bold mt-1">{{ number_format(auth()->user()->credits_total_used) }}</div>
        </div>
    </div>

    {{-- Generate CTA --}}
    <a href="{{ route('studio') }}" class="block bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-xl p-8 text-center hover:opacity-90 transition">
        <div class="text-3xl mb-2">🎬</div>
        <h2 class="text-xl font-bold">Tạo video mới</h2>
        <p class="text-white/70 mt-1">Mô tả ý tưởng của bạn, AI sẽ tạo video chỉ trong vài phút</p>
    </a>

    {{-- Recent videos --}}
    @if($recentJobs->count() > 0)
    <div>
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-bold">Video gần đây</h2>
            <a href="{{ route('videos.index') }}" class="text-sm text-[#7C3AED] hover:underline">Xem tất cả</a>
        </div>
        <div class="space-y-3">
            @foreach($recentJobs as $job)
            <a href="{{ route('videos.show', $job->uuid) }}" class="block bg-[#1A1A2E] rounded-xl p-4 border border-gray-800 hover:border-[#7C3AED]/50 transition">
                <div class="flex items-start justify-between">
                    <div class="flex-1 min-w-0 mr-4">
                        <div class="font-medium truncate">{{ $job->prompt }}</div>
                        <div class="text-sm text-[#94A3B8] mt-1">
                            {{ $job->model }} · {{ $job->duration_seconds }}s · {{ $job->resolution }}
                            @if($job->completed_at) · {{ $job->completed_at->diffForHumans() }} @endif
                        </div>
                    </div>
                    <span class="shrink-0 px-2.5 py-0.5 text-xs rounded-full font-medium
                        @if($job->status === 'completed') bg-green-500/10 text-green-400
                        @elseif(in_array($job->status, ['failed','dead'])) bg-red-500/10 text-red-400
                        @elseif($job->status === 'cancelled') bg-gray-500/10 text-gray-400
                        @else bg-yellow-500/10 text-yellow-400 @endif">
                        {{ $job->status === 'completed' ? 'Hoàn thành' : ($job->status === 'failed' ? 'Thất bại' : ($job->status === 'cancelled' ? 'Đã huỷ' : ($job->status === 'queued' ? 'Đang chờ' : ($job->status === 'created' ? 'Đã tạo' : $job->status)))) }}
                    </span>
                </div>
            </a>
            @endforeach
        </div>
    </div>
    @endif
</div>
@endsection
