<?php

namespace App\Filament\Widgets;

use Filament\Tables\Columns\TextColumn;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Http;

class ProviderModelsWidget extends BaseWidget
{
    protected static ?int $sort = 1;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = '30s';

    protected function getTableQuery(): ?\Illuminate\Database\Eloquent\Builder
    {
        return \App\Models\RenderJob::query()->whereRaw('1 = 0');
    }

    public function getTableRecords(): \Illuminate\Support\Collection
    {
        return collect($this->buildTableData());
    }

    protected function buildTableData(): array
    {
        $videoModels = [];
        $providers = [];
        try {
            $response = \Illuminate\Support\Facades\Http::timeout(5)
                ->get(config('daemon.base_url') . '/api/media/models');
            if ($response->successful()) {
                $data = $response->json();
                $providers = collect($data['providers'] ?? [])->keyBy('id');
                $videoModels = $data['video'] ?? [];
            }
        } catch (\Throwable) {}

        $aliasMap = [
            'seedance' => 'doubao-seedance-2-0-260128',
            'seedance-2.0' => 'doubao-seedance-2-0-260128',
            'seedance-2.0-fast' => 'doubao-seedance-2-0-fast-260128',
            'seedance-1.0-pro' => 'doubao-seedance-1-0-pro-250528',
            'grok' => 'grok-imagine-video',
            'grok-video' => 'grok-imagine-video',
            'veo-3' => 'veo-3',
            'veo-2' => 'veo-2',
            'kling-2.0' => 'kling-2.0',
            'kling-1.6' => 'kling-1.6',
        ];

        $rows = [];
        foreach ($videoModels as $vm) {
            $provider = $providers->get($vm['provider'] ?? '');
            $aliases = array_keys($aliasMap, $vm['id']);
            $caps = implode(', ', $vm['caps'] ?? []);

            $rows[] = [
                'model' => $vm['label'] ?? $vm['id'],
                'id' => $vm['id'],
                'provider' => $provider['label'] ?? $vm['provider'] ?? '?',
                'provider_id' => $vm['provider'] ?? '?',
                'caps' => $caps,
                'integrated' => $provider['integrated'] ?? false,
                'default' => $vm['default'] ?? false,
                'aliases' => $aliases ? implode(', ', $aliases) : '-',
            ];
        }

        usort($rows, fn($a, $b) => $b['default'] <=> $a['default'] ?: strcmp($a['provider'], $b['provider']));

        return $rows;
    }

    protected function getTableColumns(): array
    {
        return [
            TextColumn::make('model')
                ->label('Model')
                ->searchable()
                ->limit(20),

            TextColumn::make('id')
                ->label('Daemon ID')
                ->limit(30)
                ->copyable()
                ->color('gray'),

            TextColumn::make('provider')
                ->label('Provider')
                ->limit(25)
                ->badge()
                ->color(fn ($state, $record) => $record['integrated'] ? 'success' : 'danger'),

            TextColumn::make('caps')
                ->label('Khả năng')
                ->limit(25)
                ->badge()
                ->color('info'),

            TextColumn::make('aliases')
                ->label('Alias')
                ->limit(25)
                ->color('gray'),

            TextColumn::make('default')
                ->label('Mặc định')
                ->formatStateUsing(fn ($state) => $state ? '✅' : ''),
        ];
    }

    public function getTableRecordKey(mixed $row): string
    {
        return $row['id'] ?? uniqid();
    }

    protected function getTableActions(): array
    {
        return [];
    }
}
