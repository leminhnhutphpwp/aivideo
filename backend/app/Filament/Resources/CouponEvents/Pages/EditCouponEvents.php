<?php

namespace App\Filament\Resources\CouponEvents\Pages;

use App\Filament\Resources\CouponEvents\CouponEventResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditCouponEvents extends EditRecord
{
    protected static string $resource = CouponEventResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
