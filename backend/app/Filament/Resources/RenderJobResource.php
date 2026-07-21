<?php
namespace App\Filament\Resources;

use App\Filament\Resources\RenderJobResource\Pages;
use App\Models\RenderJob;
use Filament\Actions;
use Filament\Forms\Components\DatePicker;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;

class RenderJobResource extends Resource
{
    protected static ?string $model = RenderJob::class;

    protected static ?string $modelLabel = 'Job render';

    protected static ?string $pluralModelLabel = 'Job render';

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-film';

    protected static string|\UnitEnum|null $navigationGroup = 'Video Platform';

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('uuid')
                    ->label('UUID')
                    ->searchable()
                    ->copyable()
                    ->copyMessage('Đã copy UUID')
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('user.name')
                    ->label('Người dùng')
                    ->searchable(),
                Tables\Columns\TextColumn::make('status')
                    ->label('Trạng thái')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'created' => 'warning',
                        'queued' => 'gray',
                        'validating' => 'info',
                        'rendering' => 'primary',
                        'encoding' => 'primary',
                        'completed' => 'success',
                        'failed' => 'danger',
                        'cancelled' => 'danger',
                        'dead' => 'danger',
                        default => 'gray',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'created' => 'Đã tạo',
                        'queued' => 'Đang chờ',
                        'validating' => 'Đang kiểm tra',
                        'rendering' => 'Đang render',
                        'encoding' => 'Đang mã hoá',
                        'completed' => 'Hoàn thành',
                        'failed' => 'Thất bại',
                        'cancelled' => 'Đã huỷ',
                        'dead' => 'Lỗi nặng',
                        default => $state,
                    }),
                Tables\Columns\TextColumn::make('model')
                    ->label('Model'),
                Tables\Columns\TextColumn::make('duration_seconds')
                    ->label('Thời lượng')
                    ->suffix('s'),
                Tables\Columns\TextColumn::make('title')
                    ->label('Tiêu đề')
                    ->limit(40)
                    ->searchable(),
                Tables\Columns\TextColumn::make('prompt')
                    ->label('Prompt')
                    ->limit(40)
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('credits_cost')
                    ->label('Credits')
                    ->sortable(),
                Tables\Columns\TextColumn::make('gpu_seconds')
                    ->label('GPU (s)')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Tạo lúc')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                Tables\Columns\TextColumn::make('completed_at')
                    ->label('Hoàn thành')
                    ->dateTime('d/m/Y H:i')
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TrashedFilter::make(),
                Tables\Filters\SelectFilter::make('status')
                    ->label('Trạng thái')
                    ->options([
                        'created' => 'Đã tạo',
                        'queued' => 'Đang chờ',
                        'validating' => 'Đang kiểm tra',
                        'rendering' => 'Đang render',
                        'completed' => 'Hoàn thành',
                        'failed' => 'Thất bại',
                        'cancelled' => 'Đã huỷ',
                    ]),
                Tables\Filters\SelectFilter::make('model')
                    ->label('Model')
                    ->options(fn () => app(\App\Services\ModelSelector::class)->getAvailableModels()),
                Tables\Filters\Filter::make('created_at')
                    ->label('Khoảng thời gian')
                    ->form([
                        DatePicker::make('created_from')->label('Từ ngày'),
                        DatePicker::make('created_until')->label('Đến ngày'),
                    ])
                    ->query(function ($query, array $data) {
                        return $query
                            ->when($data['created_from'], fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
                            ->when($data['created_until'], fn ($q, $d) => $q->whereDate('created_at', '<=', $d));
                    }),
            ])
            ->actions([
                Actions\Action::make('view')
                    ->label('Xem')
                    ->icon('heroicon-o-eye')
                    ->modalHeading('Chi tiết job')
                    ->modalContent(function (RenderJob $record) {
                        return view('filament.resources.render-job-detail', ['job' => $record]);
                    }),
                Actions\DeleteAction::make()->label('Xoá'),
                Actions\RestoreAction::make()->label('Khôi phục'),
                Actions\ForceDeleteAction::make()->label('Xoá vĩnh viễn'),
            ])
            ->bulkActions([
                Actions\BulkActionGroup::make([
                    Actions\DeleteBulkAction::make()->label('Xoá đã chọn'),
                    Actions\RestoreBulkAction::make()->label('Khôi phục đã chọn'),
                    Actions\ForceDeleteBulkAction::make()->label('Xoá vĩnh viễn'),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRenderJobs::route('/'),
        ];
    }
}
