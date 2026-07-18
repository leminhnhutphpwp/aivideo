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
            <h4 class="text-sm font-medium text-gray-500">Số tiền</h4>
            <p class="text-sm">{{ number_format($record->amount) }}₫</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Credits nhận</h4>
            <p class="text-sm text-green-600">+{{ $record->credits }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Trạng thái</h4>
            <p class="text-sm">{{ match($record->status) { 'pending' => 'Đang chờ', 'paid' => 'Đã duyệt', 'expired' => 'Đã từ chối', default => $record->status } }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Mã tham chiếu</h4>
            <p class="text-sm font-mono">{{ $record->reference_code ?? '-' }}</p>
        </div>
    </div>
    <div>
        <h4 class="text-sm font-medium text-gray-500">Thời gian tạo</h4>
        <p class="text-sm">{{ $record->created_at?->format('d/m/Y H:i:s') }}</p>
    </div>
</div>
