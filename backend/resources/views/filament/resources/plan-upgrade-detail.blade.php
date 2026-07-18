<div class="p-4 space-y-4">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h4 class="text-sm font-medium text-gray-500">Người dùng</h4>
            <p class="text-sm">{{ $record->user?->name ?? '-' }} ({{ $record->user?->email ?? '-' }})</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Mã chuyển khoản</h4>
            <p class="text-sm font-mono">{{ $record->transfer_code }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Từ gói</h4>
            <p class="text-sm">{{ $record->fromPlan?->name ?? 'Free' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Đến gói</h4>
            <p class="text-sm text-amber-600 font-medium">{{ $record->toPlan?->name ?? '-' }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Số tiền</h4>
            <p class="text-sm">{{ number_format($record->amount) }}₫</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Trạng thái</h4>
            <p class="text-sm">{{ match($record->status) { 'pending' => 'Đang chờ', 'paid' => 'Đã duyệt', 'cancelled' => 'Đã từ chối', default => $record->status } }}</p>
        </div>
    </div>
    @if($record->description)
    <div>
        <h4 class="text-sm font-medium text-gray-500">Mô tả</h4>
        <p class="text-sm mt-1">{{ $record->description }}</p>
    </div>
    @endif
    <div>
        <h4 class="text-sm font-medium text-gray-500">Thời gian tạo</h4>
        <p class="text-sm">{{ $record->created_at?->format('d/m/Y H:i:s') }}</p>
    </div>
</div>
