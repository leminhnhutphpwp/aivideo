<?php
namespace App\Filament\Resources\PlanResource\Pages;

use App\Filament\Resources\PlanResource;
use App\Models\CreditSetting;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPlan extends EditRecord
{
    protected static string $resource = PlanResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\DeleteAction::make()];
    }

    // Tự động tính monthly_credits = ceil(price_sale × exchange_rate) + bonus_credits
    protected function mutateFormDataBeforeSave(array $data): array
    {
        $price = ($data['price_sale'] ?? 0) > 0 ? $data['price_sale'] : ($data['price_regular'] ?? 0);
        $bonus = (int) ($data['bonus_credits'] ?? 0);
        $data['monthly_credits'] = (int) ceil($price * CreditSetting::exchangeRate()) + $bonus;

        if (isset($data['model_mapping']) && is_array($data['model_mapping'])) {
            $assoc = [];
            foreach ($data['model_mapping'] as $item) {
                if (empty($item['video_type_code'])) continue;
                $modelId = $item['model_id'] === 'custom' ? ($item['custom_model_id'] ?? '') : $item['model_id'];
                if ($modelId) $assoc[$item['video_type_code']] = $modelId;
            }
            $data['model_mapping'] = $assoc;
        }

        if (isset($data['provider_config']) && is_array($data['provider_config'])) {
            $assoc = [];
            foreach ($data['provider_config'] as $item) {
                if (empty($item['provider_id'])) continue;
                $providerId = $item['provider_id'] === 'custom' ? ($item['custom_provider_id'] ?? '') : $item['provider_id'];
                if ($providerId) {
                    unset($item['provider_id'], $item['custom_provider_id']);
                    $assoc[$providerId] = $item;
                }
            }
            $data['provider_config'] = $assoc;
        }

        return $data;
    }
}
