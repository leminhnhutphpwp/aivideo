<div class="p-4 space-y-4">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h4 class="text-sm font-medium text-gray-500">UUID</h4>
            <p class="text-sm font-mono">{{ $job->uuid }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Trạng thái</h4>
            <p class="text-sm">{{ match($job->status) { 'created' => 'Đã tạo', 'queued' => 'Đang chờ', 'validating' => 'Đang kiểm tra', 'rendering' => 'Đang render', 'encoding' => 'Đang mã hoá', 'completed' => 'Hoàn thành', 'failed' => 'Thất bại', 'cancelled' => 'Đã huỷ', 'dead' => 'Lỗi nặng', default => $job->status } }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Model</h4>
            <p class="text-sm">{{ $job->model }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Thời lượng</h4>
            <p class="text-sm">{{ $job->duration_seconds }}s</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Độ phân giải</h4>
            <p class="text-sm">{{ $job->resolution }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Credits</h4>
            <p class="text-sm">{{ $job->credits_cost }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">GPU (giây)</h4>
            <p class="text-sm">{{ $job->gpu_seconds ?? '-' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Tạo lúc</h4>
            <p class="text-sm">{{ $job->created_at?->format('d/m/Y H:i') }}</p>
        </div>
    </div>
    <div>
        <h4 class="text-sm font-medium text-gray-500">Prompt</h4>
        <p class="text-sm mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">{{ $job->prompt }}</p>
    </div>
    @if($job->error_message)
        <div>
            <h4 class="text-sm font-medium text-red-500">Lỗi</h4>
            <p class="text-sm mt-1 p-2 bg-red-50 rounded text-red-700">{{ $job->error_message }}</p>
        </div>
    @endif
</div>
