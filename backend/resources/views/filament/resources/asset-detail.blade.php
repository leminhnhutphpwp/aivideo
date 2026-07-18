<div class="p-4 space-y-4">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">UUID</h4>
            <p class="text-sm font-mono">{{ $asset->uuid }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Loại</h4>
            <p class="text-sm">{{ $typeLabel }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Người dùng</h4>
            <p class="text-sm">{{ $asset->user?->name ?? 'N/A' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Kích thước</h4>
            <p class="text-sm">{{ $sizeStr }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">MIME</h4>
            <p class="text-sm font-mono">{{ $asset->mime_type }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Công khai</h4>
            <p class="text-sm">{{ $asset->is_public ? '✅ Có' : '🔒 Không' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Job ID</h4>
            <p class="text-sm">{{ $asset->render_job_id ? "#{$asset->render_job_id}" : '-' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Tạo lúc</h4>
            <p class="text-sm">{{ $asset->created_at?->format('d/m/Y H:i') }}</p>
        </div>
    </div>

    <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Tên file</h4>
        <p class="text-sm mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">{{ $asset->original_name }}</p>
    </div>

    <div>
        <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Đường dẫn</h4>
        <p class="text-sm mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 font-mono text-xs break-all">{{ $asset->path }}</p>
    </div>

    @if($asset->expires_at)
        <div>
            <h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Hết hạn lúc</h4>
            <p class="text-sm">{{ $asset->expires_at->format('d/m/Y H:i') }}</p>
        </div>
    @endif
</div>
