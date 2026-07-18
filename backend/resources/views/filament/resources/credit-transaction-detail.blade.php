<div class="p-4 space-y-4">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h4 class="text-sm font-medium text-gray-500">Loại</h4>
            <p class="text-sm">{{ match($txn->type) { 'purchase' => 'Mua', 'usage' => 'Sử dụng', 'reserved' => 'Đã giữ', 'refund' => 'Hoàn tiền', default => $txn->type } }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Số lượng</h4>
            <p class="text-sm {{ $txn->amount >= 0 ? 'text-green-600' : 'text-red-600' }}">{{ $txn->amount >= 0 ? '+' : '' }}{{ $txn->amount }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Số dư trước</h4>
            <p class="text-sm">{{ $txn->balance_before }}</p>
        </div>
        <div>
            <h4 class="text-sm font-medium text-gray-500">Số dư sau</h4>
            <p class="text-sm">{{ $txn->balance_after }}</p>
        </div>
    </div>
    <div>
        <h4 class="text-sm font-medium text-gray-500">Mô tả</h4>
        <p class="text-sm mt-1">{{ $txn->description ?? '-' }}</p>
    </div>
    <div>
        <h4 class="text-sm font-medium text-gray-500">Thời gian</h4>
        <p class="text-sm">{{ $txn->created_at?->format('d/m/Y H:i:s') }}</p>
    </div>
</div>
