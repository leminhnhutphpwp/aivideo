<?php

namespace Database\Seeders;

use App\Models\CreditSetting;
use Illuminate\Database\Seeder;

class CreditSettingsSeeder extends Seeder
{
    public function run(): void
    {
        // Exchange rate: 1 VNĐ = 0.1 credit (10 VNĐ = 1 credit)
        // Single source of truth: thay đổi exchange_rate → tất cả tính toán tự cập nhật
        // Công thức: credits = ceil(VNĐ × exchange_rate)
        // Ví dụ: 500.000đ × 0.1 = 50.000 credits
        CreditSetting::updateOrCreate(
            ['key' => 'exchange_rate'],
            [
                'label' => 'Tỷ giá quy đổi',
                'value' => 0.1,
                'unit' => 'credits',
                'description' => 'Số credits nhận được khi nạp 1 VNĐ. 0.1 — nạp 10.000đ = 1.000 credits. 500.000đ = 50.000 credits.',
                'is_active' => true,
                'sort_order' => 1,
            ]
        );

        // Minimum purchase amount
        CreditSetting::updateOrCreate(
            ['key' => 'min_purchase_amount'],
            [
                'label' => 'Số tiền nạp tối thiểu',
                'value' => 50000,
                'unit' => 'VNĐ',
                'description' => 'Số tiền tối thiểu để thực hiện nạp credits.',
                'is_active' => true,
                'sort_order' => 2,
            ]
        );

        // Maximum purchase amount
        CreditSetting::updateOrCreate(
            ['key' => 'max_purchase_amount'],
            [
                'label' => 'Số tiền nạp tối đa',
                'value' => 10000000,
                'unit' => 'VNĐ',
                'description' => 'Số tiền tối đa cho một lần nạp credits.',
                'is_active' => true,
                'sort_order' => 3,
            ]
        );
    }
}
