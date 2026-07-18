@extends('layouts.app')

@section('title', 'Credits')

@section('content')
<div class="max-w-4xl mx-auto space-y-8">
    <div>
        <h1 class="text-2xl font-bold">Credits & Nạp tiền</h1>
        <p class="text-[#94A3B8] mt-1">Quản lý credits và gói dịch vụ của bạn</p>
    </div>

    {{-- Current balance --}}
    <div class="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] rounded-xl p-6">
        <div class="text-white/70 text-sm">Số dư hiện tại</div>
        <div class="text-3xl font-bold mt-1">{{ number_format(auth()->user()->credits) }} credits</div>
        <div class="text-white/70 text-sm mt-2">Đã dùng tháng này: {{ number_format(auth()->user()->credits_total_used) }}</div>
    </div>

    {{-- Plans --}}
    <div>
        <h2 class="text-lg font-bold mb-4">Gói dịch vụ</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            @foreach($plans as $plan)
            <div class="bg-[#1A1A2E] rounded-xl border border-gray-800 p-6 {{ auth()->user()->plan_id === $plan->id ? 'ring-2 ring-[#7C3AED]' : '' }}">
                <h3 class="text-lg font-bold">{{ $plan->name }}</h3>
                <div class="text-2xl font-bold mt-2">
                    @if($plan->price_sale)
                        <span class="line-through text-lg text-[#94A3B8]">{{ number_format($plan->price_regular).'₫' }}</span>
                        {{ number_format($plan->price_sale).'₫' }}
                    @elseif($plan->price_regular > 0)
                        {{ number_format($plan->price_regular).'₫' }}
                    @else
                        Miễn phí
                    @endif
                    <span class="text-sm text-[#94A3B8]">/tháng</span>
                </div>
                <ul class="mt-4 space-y-2 text-sm text-[#94A3B8]">
                    <li>✅ {{ $plan->max_concurrent_jobs }} job đồng thời</li>
                    <li>✅ {{ number_format($plan->monthly_credits) }} credits/tháng</li>
                    <li>✅ {{ $plan->watermark ? 'Có watermark' : 'Không watermark' }}</li>
                </ul>
                @if(auth()->user()->plan_id === $plan->id)
                    <div class="mt-4 text-center text-sm text-[#7C3AED] font-medium">Gói hiện tại</div>
                @else
                    <button class="mt-4 w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition" disabled>Liên hệ</button>
                @endif
            </div>
            @endforeach
        </div>
    </div>

    {{-- Top up --}}
    <div class="bg-[#1A1A2E] rounded-xl border border-gray-800 p-6" x-data="creditTopup()">
        <h2 class="text-lg font-bold mb-4">Nạp credits</h2>
        <p class="text-sm text-[#94A3B8] mb-4">Chọn số tiền muốn nạp, hệ thống sẽ hiển thị thông tin chuyển khoản</p>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <template x-for="amount in [50000, 100000, 200000, 500000]" :key="amount">
                <button @click="selectAmount(amount)" class="px-4 py-3 rounded-lg border text-sm font-medium transition" :class="selected === amount ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-[#0A0A0F] border-gray-700 text-[#94A3B8] hover:border-gray-500'">
                    <div x-text="(amount/1000).toLocaleString() + 'k'"></div>
                    <div class="text-xs mt-0.5 opacity-70" x-text="'+' + Math.floor(amount/1000) + ' credits'"></div>
                </button>
            </template>
        </div>

        <div x-show="bankInfo" x-cloak class="bg-[#0A0A0F] rounded-lg p-4 space-y-2 text-sm">
            <h3 class="font-medium text-[#7C3AED]">Thông tin chuyển khoản</h3>
            <div class="grid grid-cols-2 gap-2 text-[#94A3B8]">
                <div>Ngân hàng:</div><div class="text-white" x-text="bankInfo?.bank"></div>
                <div>Số tài khoản:</div><div class="text-white font-mono" x-text="bankInfo?.account"></div>
                <div>Chủ tài khoản:</div><div class="text-white" x-text="bankInfo?.holder"></div>
                <div>Số tiền:</div><div class="text-white font-bold" x-text="(selected || 0).toLocaleString() + '₫'"></div>
                <div>Nội dung:</div><div class="text-white font-mono bg-[#1A1A2E] px-2 py-1 rounded" x-text="bankInfo?.content"></div>
            </div>
            <p class="text-xs text-yellow-400 mt-2">⚠️ Sao chép chính xác nội dung chuyển khoản để được cộng credits tự động</p>
        </div>

        <div x-show="loading" class="text-sm text-[#94A3B8] mt-4">⏳ Đang xử lý...</div>
        <div x-show="error" x-cloak class="text-sm text-red-400 mt-4" x-text="error"></div>
    </div>

    {{-- History --}}
    @if($transactions->count() > 0)
    <div>
        <h2 class="text-lg font-bold mb-4">Lịch sử giao dịch</h2>
        <div class="bg-[#1A1A2E] rounded-xl border border-gray-800 overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-[#0A0A0F] text-[#94A3B8]">
                    <tr><th class="px-4 py-3 text-left font-medium">Loại</th><th class="px-4 py-3 text-right font-medium">Số lượng</th><th class="px-4 py-3 text-right font-medium">Số dư</th><th class="px-4 py-3 text-left font-medium hidden md:table-cell">Mô tả</th><th class="px-4 py-3 text-right font-medium hidden md:table-cell">Ngày</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-800">
                    @foreach($transactions as $txn)
                    <tr class="hover:bg-white/5">
                        <td class="px-4 py-3">
                            <span class="px-2 py-0.5 rounded-full text-xs font-medium
                                @if($txn->type === 'purchase') bg-green-500/10 text-green-400
                                @elseif(in_array($txn->type,['usage','reserved'])) bg-yellow-500/10 text-yellow-400
                                @elseif($txn->type === 'refund') bg-blue-500/10 text-blue-400
                                @else bg-gray-500/10 text-gray-400 @endif">
                                {{ $txn->type === 'purchase' ? 'Nạp' : ($txn->type === 'usage' ? 'Sử dụng' : ($txn->type === 'reserved' ? 'Đã giữ' : ($txn->type === 'refund' ? 'Hoàn' : $txn->type))) }}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right font-medium {{ $txn->amount >= 0 ? 'text-green-400' : 'text-red-400' }}">{{ $txn->amount >= 0 ? '+' : '' }}{{ $txn->amount }}</td>
                        <td class="px-4 py-3 text-right">{{ $txn->balance_after }}</td>
                        <td class="px-4 py-3 text-[#94A3B8] truncate max-w-xs hidden md:table-cell">{{ $txn->description }}</td>
                        <td class="px-4 py-3 text-right text-[#94A3B8] hidden md:table-cell">{{ $txn->created_at?->format('d/m/Y') }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
    @endif
</div>

@push('scripts')
<script>
function creditTopup() {
    return {
        selected: null,
        bankInfo: null,
        loading: false,
        error: '',
        async selectAmount(amount) {
            this.selected = amount;
            this.loading = true;
            this.error = '';
            try {
                const res = await fetch('/api/credits/purchase', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer {{ session("jwt_token") }}' },
                    body: JSON.stringify({ amount }),
                });
                const data = await res.json();
                if (res.ok) {
                    this.bankInfo = data;
                } else {
                    this.error = data.error || 'Có lỗi xảy ra';
                }
            } catch(e) {
                this.error = 'Không thể kết nối server';
            } finally {
                this.loading = false;
            }
        }
    }
}
</script>
@endpush
@endsection
