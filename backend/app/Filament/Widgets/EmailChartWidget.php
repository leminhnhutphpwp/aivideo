<?php

namespace App\Filament\Widgets;

use Filament\Widgets\ChartWidget;

use App\Models\EmailLog;

class EmailChartWidget extends ChartWidget
{
    protected static ?int $sort = -1;

    protected int | string | array $columnSpan = 'full';

    protected ?string $maxHeight = '250px';

    protected ?string $heading = 'Tần suất gửi Email (7 ngày gần nhất)';

    protected function getData(): array
    {
        $days = [];
        $values = [];

        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $days[] = $date->format('d/m');
            
            $values[] = EmailLog::whereDate('created_at', $date->toDateString())
                ->where('status', 'sent')
                ->count();
        }

        return [
            'datasets' => [
                [
                    'label' => 'Email đã gửi',
                    'data' => $values,
                    'borderColor' => '#10b981',
                    'backgroundColor' => 'rgba(16, 185, 129, 0.1)',
                    'fill' => 'start',
                    'tension' => 0.4,
                ],
            ],
            'labels' => $days,
        ];
    }

    protected function getType(): string
    {
        return 'line';
    }
}
