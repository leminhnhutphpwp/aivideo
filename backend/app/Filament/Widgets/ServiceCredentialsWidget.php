<?php

namespace App\Filament\Widgets;

use Filament\Tables;
use Filament\Tables\Columns\TextColumn;
use Filament\Widgets\TableWidget as BaseWidget;

class ServiceCredentialsWidget extends BaseWidget
{
    protected static ?int $sort = 10;

    protected int | string | array $columnSpan = 'full';

    protected function getTableQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return \App\Models\RenderJob::query()->whereRaw('1 = 0');
    }

    public function getTableRecords(): \Illuminate\Support\Collection
    {
        return collect([
            [
                'service' => 'MinIO Console',
                'url' => config('services.minio.url', 'http://localhost:9001'),
                'username' => config('services.minio.username', 'minio-dev-X9k2'),
                'password' => config('services.minio.password', ''),
                'desc' => 'Quản lý file video, hình ảnh (S3-compatible) - DEV',
            ],
            [
                'service' => 'phpMyAdmin',
                'url' => config('services.phpmyadmin.url', 'http://localhost:8081'),
                'username' => config('services.phpmyadmin.username', 'root'),
                'password' => config('services.phpmyadmin.password', ''),
                'desc' => 'Quản lý database MySQL - DEV',
            ],
            [
                'service' => 'Reverb WebSocket',
                'url' => config('services.reverb.url', 'http://localhost:8080'),
                'username' => config('services.reverb.username', '515932'),
                'password' => config('services.reverb.password', ''),
                'desc' => 'Realtime broadcasting - DEV',
            ],
            [
                'service' => 'Prometheus',
                'url' => config('services.prometheus.url', 'http://localhost:9090'),
                'username' => config('services.prometheus.username', 'admin'),
                'password' => config('services.prometheus.password', ''),
                'desc' => 'Metrics & monitoring - có basic auth',
            ],
            [
                'service' => 'Grafana',
                'url' => config('services.grafana.url', 'http://localhost:3001'),
                'username' => config('services.grafana.username', 'admin'),
                'password' => config('services.grafana.password', ''),
                'desc' => 'Dashboard monitoring - có basic auth',
            ],
        ]);
    }

    protected function getTableColumns(): array
    {
        return [
            TextColumn::make('service')
                ->label('Dịch vụ')
                ->weight('bold'),

            TextColumn::make('url')
                ->label('URL')
                ->copyable()
                ->copyMessage('Đã copy URL')
                ->limit(30),

            TextColumn::make('username')
                ->label('Username')
                ->default('-')
                ->copyable()
                ->copyMessage('Đã copy username'),

            TextColumn::make('password')
                ->label('Password')
                ->default('-')
                ->formatStateUsing(fn ($state) => $state ? str_repeat('●', 16) : '-')
                ->copyable()
                ->copyableState(fn (array $record): string => $record['password'] ?? '')
                ->copyMessage('Đã copy password')
                ->tooltip('Click để copy password'),

            TextColumn::make('desc')
                ->label('Mô tả')
                ->limit(40)
                ->color('gray'),
        ];
    }

    protected function getTableActions(): array
    {
        return [
            \Filament\Actions\Action::make('open')
                ->label('Mở')
                ->icon('heroicon-m-arrow-top-right-on-square')
                ->url(fn (array $record): string => $record['url'] ?? '#')
                ->openUrlInNewTab()
                ->hidden(fn (array $record): bool => is_null($record['url'])),
        ];
    }

    public function getTableRecordKey(mixed $row): string
    {
        return $row['service'] ?? uniqid();
    }

    public function getTableHeading(): string
    {
        return 'Thông tin dịch vụ ngoài';
    }
}
