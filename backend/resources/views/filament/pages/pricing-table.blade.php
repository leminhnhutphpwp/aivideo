<x-filament-panels::page>
@push('styles')
<style>
    .dark .pricing-table thead tr,
    .dark .pricing-table thead th {
        background-color: var(--gray-800) !important;
    }
    .dark .pricing-table tbody tr[class*="bg-gray-50"],
    .dark .pricing-table tbody tr[class*="bg-gray"] td {
        background-color: rgba(255, 255, 255, 0.05) !important;
    }
    .dark .pricing-table tbody tr:not([class*="bg-blue"]):not([class*="bg-gray"]) {
        background-color: transparent !important;
    }
    .dark .pricing-table tbody tr:hover td {
        background-color: rgba(255, 255, 255, 0.05) !important;
    }
</style>
@endpush
<div class="pricing-table">

    {{-- Filters --}}
    <x-filament::section
        class="mb-2"
        heading="Bộ lọc"
        icon="heroicon-o-funnel"
        icon-color="gray"
        :contained="true"
    >
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
                <label class="fi-input-label block text-sm font-medium leading-6 text-gray-950 dark:text-white mb-1.5">Loại Video</label>
                <x-filament::input.wrapper>
                    <x-filament::input.select wire:model.live="selectedVideoType">
                        @foreach($this->videoTypes as $type)
                            <option value="{{ $type->code }}">{{ $type->name }}</option>
                        @endforeach
                    </x-filament::input.select>
                </x-filament::input.wrapper>
            </div>
            <div>
                <label class="fi-input-label block text-sm font-medium leading-6 text-gray-950 dark:text-white mb-1.5">Thời Lượng</label>
                <x-filament::input.wrapper>
                    <x-filament::input.select wire:model.live="selectedDuration">
                        @foreach($this->durations as $d)
                            <option value="{{ $d->code }}">{{ $d->name }}</option>
                        @endforeach
                    </x-filament::input.select>
                </x-filament::input.wrapper>
            </div>
            <div>
                <label class="fi-input-label block text-sm font-medium leading-6 text-gray-950 dark:text-white mb-1.5">Độ Phân Giải</label>
                <x-filament::input.wrapper>
                    <x-filament::input.select wire:model.live="selectedResolution">
                        @foreach($this->resolutions as $r)
                            <option value="{{ $r->code }}">{{ $r->name }}</option>
                        @endforeach
                    </x-filament::input.select>
                </x-filament::input.wrapper>
            </div>
            <div>
                <label class="fi-input-label block text-sm font-medium leading-6 text-gray-950 dark:text-white mb-1.5">Chất Lượng</label>
                <x-filament::input.wrapper>
                    <x-filament::input.select wire:model.live="selectedQuality">
                        @foreach($this->qualities as $q)
                            <option value="{{ $q->code }}">{{ $q->name }}</option>
                        @endforeach
                    </x-filament::input.select>
                </x-filament::input.wrapper>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Standard: Model rẻ • Premium: Model tốt • Ultra: Model xịn</p>
            </div>
        </div>
    </x-filament::section>

    {{-- Summary --}}
    <x-filament::section
        class="mt-4"
        heading="Tổng Quan Giá"
        icon="heroicon-o-calculator"
        icon-color="primary"
        :contained="true"
    >
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="text-center p-4 rounded-lg bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800">
                <div class="text-sm text-gray-600 dark:text-gray-400">Loại Video</div>
                <div class="text-lg font-bold text-blue-700 dark:text-blue-400 mt-1">{{ $this->pricingData['breakdown']['video_type']['name'] ?? '-' }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{{ $this->pricingData['breakdown']['video_type']['base_credits'] ?? 0 }} credits</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-green-50 ring-1 ring-green-200 dark:bg-green-900/20 dark:ring-green-800">
                <div class="text-sm text-gray-600 dark:text-gray-400">Thời Lượng</div>
                <div class="text-lg font-bold text-green-700 dark:text-green-400 mt-1">{{ $this->pricingData['breakdown']['duration']['name'] ?? '-' }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-0.5">x{{ $this->pricingData['breakdown']['duration']['multiplier'] ?? 1 }}</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-purple-50 ring-1 ring-purple-200 dark:bg-purple-900/20 dark:ring-purple-800">
                <div class="text-sm text-gray-600 dark:text-gray-400">Độ Phân Giải</div>
                <div class="text-lg font-bold text-purple-700 dark:text-purple-400 mt-1">{{ $this->pricingData['breakdown']['resolution']['name'] ?? '-' }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-0.5">x{{ $this->pricingData['breakdown']['resolution']['multiplier'] ?? 1 }}</div>
            </div>
            <div class="text-center p-4 rounded-lg bg-orange-50 ring-1 ring-orange-200 dark:bg-orange-900/20 dark:ring-orange-800">
                <div class="text-sm text-gray-600 dark:text-gray-400">Chất Lượng</div>
                <div class="text-lg font-bold text-orange-700 dark:text-orange-400 mt-1">{{ $this->pricingData['breakdown']['quality']['name'] ?? '-' }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-500 mt-0.5">x{{ $this->pricingData['breakdown']['quality']['multiplier'] ?? 1 }} • Daemon chọn model</div>
            </div>
        </div>
        <div class="mt-6 text-center">
            <div class="inline-block px-8 py-5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white shadow-lg">
                <div class="text-sm opacity-90">Tổng Credits</div>
                <div class="text-4xl font-bold mt-1">{{ number_format($this->pricingData['pricing']['total_credits'] ?? 0) }} credits</div>
                <div class="text-sm opacity-90 mt-1">≈ {{ number_format($this->pricingData['pricing']['vnd_equivalent'] ?? 0) }} VNĐ</div>
            </div>
        </div>
    </x-filament::section>

    {{-- Provider Comparison --}}
    <x-filament::section
        class="mt-4"
        heading="So Sánh Provider"
        icon="heroicon-o-building-office-2"
        icon-color="gray"
        :contained="true"
    >
        <div class="overflow-x-auto rounded-lg ring-1 ring-gray-950/5 dark:ring-white/10">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-gray-200 dark:border-gray-600">
                        <th class="text-left py-3 px-4 font-semibold text-gray-950 dark:text-white">Provider</th>
                        <th class="text-center py-3 px-4 font-semibold text-gray-950 dark:text-white">Multiplier</th>
                        <th class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">Total Credits</th>
                        <th class="text-left py-3 px-4 font-semibold text-gray-950 dark:text-white">Mô Tả</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    @forelse($this->comparisonData as $index => $provider)
                    <tr class="{{ $index === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30' }}">
                        <td class="py-3 px-4 font-semibold text-gray-950 dark:text-white">{{ $provider['provider'] }}</td>
                        <td class="text-center py-3 px-4">
                            <span class="inline-block px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-xs font-medium">{{ $provider['multiplier'] }}</span>
                        </td>
                        <td class="text-right py-3 px-4 font-bold text-blue-600 dark:text-blue-400">{{ number_format($provider['total_credits']) }}</td>
                        <td class="text-left py-3 px-4 text-gray-600 dark:text-gray-400 text-sm">{{ $provider['description'] }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="4" class="py-8 text-center text-gray-500 dark:text-gray-400">Không có dữ liệu provider</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>
    </x-filament::section>

    {{-- Breakdown --}}
    <x-filament::section
        class="mt-4"
        heading="Chi Tiết Tính Toán"
        icon="heroicon-o-document-text"
        icon-color="gray"
        :contained="true"
    >
        <div class="overflow-x-auto rounded-lg ring-1 ring-gray-950/5 dark:ring-white/10">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b border-gray-200 dark:border-gray-600">
                        <th class="text-left py-3 px-4 font-semibold text-gray-950 dark:text-white">Thành Phần</th>
                        <th class="text-center py-3 px-4 font-semibold text-gray-950 dark:text-white">Multiplier</th>
                        <th class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">Credits</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr class="bg-transparent">
                        <td class="py-3 px-4 text-gray-950 dark:text-white">Base</td>
                        <td class="text-center py-3 px-4 text-gray-600 dark:text-gray-400">1.0x</td>
                        <td class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">{{ $this->pricingData['breakdown']['video_type']['base_credits'] ?? 0 }}</td>
                    </tr>
                    <tr class="bg-transparent">
                        <td class="py-3 px-4 text-gray-950 dark:text-white">Duration</td>
                        <td class="text-center py-3 px-4 text-gray-600 dark:text-gray-400">x{{ $this->pricingData['breakdown']['duration']['multiplier'] ?? 1 }}</td>
                        <td class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">{{ $this->pricingData['breakdown']['duration']['cost'] ?? 0 }}</td>
                    </tr>
                    <tr class="bg-transparent">
                        <td class="py-3 px-4 text-gray-950 dark:text-white">Resolution</td>
                        <td class="text-center py-3 px-4 text-gray-600 dark:text-gray-400">x{{ $this->pricingData['breakdown']['resolution']['multiplier'] ?? 1 }}</td>
                        <td class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">{{ $this->pricingData['breakdown']['resolution']['cost'] ?? 0 }}</td>
                    </tr>
                    <tr class="bg-transparent">
                        <td class="py-3 px-4 text-gray-950 dark:text-white">Quality</td>
                        <td class="text-center py-3 px-4 text-gray-600 dark:text-gray-400">x{{ $this->pricingData['breakdown']['quality']['multiplier'] ?? 1 }}</td>
                        <td class="text-right py-3 px-4 font-semibold text-gray-950 dark:text-white">{{ $this->pricingData['breakdown']['quality']['cost'] ?? 0 }}</td>
                    </tr>
                    <tr class="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                        <td class="py-3 px-4 text-gray-950 dark:text-white">Subtotal</td>
                        <td class="text-center py-3 px-4 text-gray-600 dark:text-gray-400">-</td>
                        <td class="text-right py-3 px-4 text-gray-950 dark:text-white">{{ $this->pricingData['pricing']['subtotal'] ?? 0 }}</td>
                    </tr>
                    <tr class="bg-blue-50 dark:bg-blue-900/20 font-bold">
                        <td class="py-3.5 px-4 text-gray-950 dark:text-white">TOTAL</td>
                        <td class="text-center py-3.5 px-4 text-gray-600 dark:text-gray-400">-</td>
                        <td class="text-right py-3.5 px-4 text-2xl text-blue-600 dark:text-blue-400">{{ $this->pricingData['pricing']['total_credits'] ?? 0 }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </x-filament::section>

</div>
</x-filament-panels::page>
