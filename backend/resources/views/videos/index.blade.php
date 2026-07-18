@extends('layouts.app')

@section('title', 'My Videos')

@section('content')
<div class="max-w-6xl mx-auto">
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-2xl font-bold">My Videos</h1>
            <p class="text-[#94A3B8] mt-1">Tất cả video bạn đã tạo</p>
        </div>
        <a href="{{ route('studio') }}" class="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg text-sm font-medium transition">+ Tạo mới</a>
    </div>

    @if($jobs->count() > 0)
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @foreach($jobs as $job)
        <a href="{{ route('videos.show', $job->uuid) }}" class="bg-[#1A1A2E] rounded-xl border border-gray-800 hover:border-[#7C3AED]/50 transition overflow-hidden group">
            <div class="aspect-video bg-[#0A0A0F] flex items-center justify-center">
                @if($job->status === 'completed' && $job->thumbnail_path)
                    <img src="{{ Storage::url($job->thumbnail_path) }}" class="w-full h-full object-cover" alt="">
                @else
                    <span class="text-4xl">🎬</span>
                @endif
            </div>
            <div class="p-4">
                <div class="font-medium text-sm truncate">{{ $job->prompt }}</div>
                <div class="flex items-center justify-between mt-2">
                    <span class="text-xs text-[#94A3B8]">{{ $job->model }} · {{ $job->duration_seconds }}s</span>
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium
                        @if($job->status === 'completed') bg-green-500/10 text-green-400
                        @elseif(in_array($job->status, ['failed','dead'])) bg-red-500/10 text-red-400
                        @else bg-yellow-500/10 text-yellow-400 @endif">
                        {{ $job->status === 'completed' ? 'Hoàn thành' : ($job->status === 'failed' ? 'Thất bại' : ($job->status === 'cancelled' ? 'Đã huỷ' : 'Đang xử lý')) }}
                    </span>
                </div>
            </div>
        </a>
        @endforeach
    </div>

    <div class="mt-8">
        {{ $jobs->links() }}
    </div>
    @else
    <div class="text-center py-20 text-[#94A3B8]">
        <div class="text-6xl mb-4">🎥</div>
        <h3 class="text-lg font-medium mb-2">Chưa có video nào</h3>
        <p class="mb-6">Tạo video đầu tiên của bạn ngay bây giờ</p>
        <a href="{{ route('studio') }}" class="inline-block px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg font-medium transition">Tạo video</a>
    </div>
    @endif
</div>
@endsection
