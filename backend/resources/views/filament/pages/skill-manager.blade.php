<x-filament-panels::page>
    @php
        $typeBadge = [
            'multi' => ['Đa-skill · thêm được', 'success'],
            'single' => ['1-file · chỉ sửa', 'info'],
            'unloaded' => ['Không dùng · daemon bỏ qua', 'warning'],
        ];
        $groups = $this->groups;
    @endphp

    <div class="space-y-4">
        <div class="text-sm text-gray-500 dark:text-gray-400">
            Tổng <strong>{{ count($skills) }}</strong> skills trong <code>/skills</code>.
            Sửa frontmatter (YAML) + body trực tiếp — lưu xong daemon tự reload cache, không cần restart.
        </div>

        {{-- Search --}}
        <x-filament::input.wrapper prefix-icon="heroicon-m-magnifying-glass">
            <x-filament::input
                type="text"
                wire:model.live.debounce.300ms="search"
                placeholder="Tìm skill theo id, label hoặc mô tả..."
            />
        </x-filament::input.wrapper>

        {{-- Accordion groups --}}
        @forelse ($groups as $collection => $group)
            @php
                $isOpen = filled($search) || ($open[$collection] ?? false);
                [$badgeLabel, $badgeColor] = $typeBadge[$group['type']] ?? ['?', 'gray'];
            @endphp

            <div class="rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-900/40">
                {{-- Header (click to toggle) --}}
                <button
                    type="button"
                    wire:click="toggleOpen(@js($collection))"
                    class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition"
                >
                    <span class="flex items-center gap-2 min-w-0">
                        <x-filament::icon
                            :icon="$isOpen ? 'heroicon-m-chevron-down' : 'heroicon-m-chevron-right'"
                            class="h-4 w-4 text-gray-400 shrink-0"
                        />
                        <span class="font-semibold text-gray-900 dark:text-white truncate">{{ $collection }}</span>
                        <x-filament::badge :color="$badgeColor" size="sm">{{ $badgeLabel }}</x-filament::badge>
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 shrink-0">{{ $group['total'] }} skill</span>
                </button>

                @if ($isOpen)
                    <div class="px-4 pb-3 border-t border-gray-100 dark:border-white/5">
                        @if ($group['type'] === 'unloaded')
                            <p class="my-2 text-xs text-amber-600 dark:text-amber-400">Thư mục có trên disk nhưng daemon không load — sửa/thêm không có tác dụng.</p>
                        @endif

                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead>
                                    <tr class="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
                                        <th class="py-2 pr-3 font-medium">ID</th>
                                        <th class="py-2 pr-3 font-medium">Label</th>
                                        <th class="py-2 pr-3 font-medium">Trạng thái</th>
                                        <th class="py-2 pr-3 font-medium">Mô tả</th>
                                        <th class="py-2 pr-3 font-medium text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($group['items'] as $skill)
                                        <tr class="border-b border-gray-100 dark:border-white/5">
                                            <td class="py-2 pr-3 font-mono text-xs text-gray-700 dark:text-gray-300">{{ $skill['id'] }}</td>
                                            <td class="py-2 pr-3 font-medium">{{ $skill['label'] }}</td>
                                            <td class="py-2 pr-3">
                                                @if (($skill['status'] ?? 'published') === 'draft')
                                                    <x-filament::badge color="warning" size="sm">Nháp</x-filament::badge>
                                                @else
                                                    <x-filament::badge color="success" size="sm">Published</x-filament::badge>
                                                @endif
                                            </td>
                                            <td class="py-2 pr-3 text-gray-500 dark:text-gray-400 max-w-md truncate">{{ $skill['description'] }}</td>
                                            <td class="py-2 pr-3">
                                                <div class="flex justify-end gap-2">
                                                    <x-filament::button
                                                        size="xs"
                                                        color="{{ ($skill['status'] ?? 'published') === 'draft' ? 'success' : 'warning' }}"
                                                        icon="heroicon-m-eye"
                                                        wire:click="openToggle('{{ $skill['id'] }}')"
                                                    >
                                                        {{ ($skill['status'] ?? 'published') === 'draft' ? 'Publish' : 'Ẩn' }}
                                                    </x-filament::button>
                                                    <x-filament::button
                                                        size="xs"
                                                        color="gray"
                                                        icon="heroicon-m-pencil-square"
                                                        wire:click="openEdit('{{ $skill['id'] }}')"
                                                    >
                                                        Sửa
                                                    </x-filament::button>
                                                    <x-filament::button
                                                        size="xs"
                                                        color="danger"
                                                        icon="heroicon-m-trash"
                                                        wire:click="openDelete('{{ $skill['id'] }}')"
                                                    >
                                                        Xoá
                                                    </x-filament::button>
                                                </div>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>

                        {{-- Pagination (only when the group spills past one page) --}}
                        @if ($group['pageCount'] > 1)
                            <div class="flex items-center justify-between gap-2 pt-3">
                                <span class="text-xs text-gray-400">Trang {{ $group['page'] }}/{{ $group['pageCount'] }}</span>
                                <div class="flex items-center gap-1">
                                    <x-filament::button size="xs" color="gray" icon="heroicon-m-chevron-left"
                                        wire:click="gotoPage('{{ $collection }}', {{ $group['page'] - 1 }})"
                                        :disabled="$group['page'] <= 1" />
                                    @foreach (range(1, $group['pageCount']) as $p)
                                        <x-filament::button
                                            size="xs"
                                            :color="$p === $group['page'] ? 'primary' : 'gray'"
                                            wire:click="gotoPage('{{ $collection }}', {{ $p }})"
                                        >{{ $p }}</x-filament::button>
                                    @endforeach
                                    <x-filament::button size="xs" color="gray" icon="heroicon-m-chevron-right"
                                        wire:click="gotoPage('{{ $collection }}', {{ $group['page'] + 1 }})"
                                        :disabled="$group['page'] >= $group['pageCount']" />
                                </div>
                            </div>
                        @endif
                    </div>
                @endif
            </div>
        @empty
            <div class="rounded-xl border border-dashed border-gray-300 dark:border-white/10 px-4 py-8 text-center text-sm text-gray-500">
                Không tìm thấy skill nào khớp “{{ $search }}”.
            </div>
        @endforelse
    </div>

    <x-filament-actions::modals />
</x-filament-panels::page>
