<?php

namespace App\Filament\Resources\CouponEvents\Pages;

use App\Filament\Resources\CouponEvents\CouponEventResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCouponEvents extends ListRecords
{
    protected static string $resource = CouponEventResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
