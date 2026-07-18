<?php

namespace App\Filament\Widgets;

use App\Models\RenderJob;
use Filament\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Widgets\TableWidget as BaseWidget;

class RecentJobsWidget extends BaseWidget
{
    protected static ?int $sort = -3;

    protected int | string | array $columnSpan = 'full';

    protected ?string $pollingInterval = '10s';

    protected function getTableQuery(): \Illuminate\Database\Eloquent\Builder
    {
        return RenderJob::query()
            ->with('user')
            ->latest()
            ->limit(20);
    }

    protected function getTableColumns(): array
    {
        return [
            TextColumn::make('id')
                ->label('ID')
                ->sortable()
                ->width(50),

            TextColumn::make('uuid')
                ->label('UUID')
                ->searchable()
                ->limit(12)
                ->copyable(),

            TextColumn::make('user.name')
                ->label('Người dùng')
                ->searchable()
                ->limit(20),

            TextColumn::make('status')
                ->label('Trạng thái')
                ->badge()
                ->color(fn (string $state): string => match ($state) {
                    'queued' => 'gray',
                    'processing' => 'warning',
                    'completed' => 'success',
                    'failed' => 'danger',
                    'cancelled' => 'info',
                    default => 'gray',
                })
                ->formatStateUsing(fn (string $state): string => match ($state) {
                    'queued' => 'Đang chờ',
                    'processing' => 'Đang xử lý',
                    'completed' => 'Hoàn thành',
                    'failed' => 'Thất bại',
                    'cancelled' => 'Đã huỷ',
                    default => $state,
                }),

            TextColumn::make('model')
                ->label('Model')
                ->limit(18),

            TextColumn::make('duration_seconds')
                ->label('Độ dài')
                ->formatStateUsing(fn ($state) => "{$state}s"),

            TextColumn::make('credits_cost')
                ->label('Credits')
                ->sortable(),

            TextColumn::make('gpu_seconds')
                ->label('GPU')
                ->formatStateUsing(fn ($state) => $state ? "{$state}s" : '-'),

            TextColumn::make('created_at')
                ->label('Tạo lúc')
                ->dateTime('H:i:s')
                ->sortable(),
        ];
    }

    protected function getTableActions(): array
    {
        return [
            Action::make('view')
                ->label('Chi tiết')
                ->icon('heroicon-m-eye')
                ->modalHeading(fn (RenderJob $record): string => "Job #{$record->id}")
                ->modalContent(function (RenderJob $record) {
                    $prompt = $record->prompt ?? 'N/A';
                    $assets = $record->assets;
                    return view('filament.resources.render-job-detail', ['job' => $record]);
                }),
        ];
    }
}
