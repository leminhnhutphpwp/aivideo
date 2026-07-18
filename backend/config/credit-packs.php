<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Credit Pack Configuration
    |--------------------------------------------------------------------------
    |
    | Pricing philosophy:
    | - Single source of truth: exchange_rate from CreditSetting
    | - All credit calculations use exchange_rate (admin-configurable)
    | - When admin changes exchange_rate → everything updates
    |
    | exchange_rate = 0.1 means: 1 VNĐ = 0.1 credits (10 VNĐ = 1 credit)
    | - 50,000 VNĐ → 5,000 credits
    | - 249,000 VNĐ → 24,900 credits
    |
    | Credit packs define minimum purchase tiers (no separate rates)
    | All packs use the same exchange_rate from CreditSetting
    |
    */

    'packs' => [
        ['id' => 'small', 'min_amount' => 50000],     // 50k VNĐ
        ['id' => 'medium', 'min_amount' => 100000],    // 100k VNĐ
        ['id' => 'mid', 'min_amount' => 150000],       // 150k VNĐ
        ['id' => 'large', 'min_amount' => 200000],     // 200k VNĐ
        ['id' => 'xlarge', 'min_amount' => 300000],    // 300k VNĐ
        ['id' => 'premium', 'min_amount' => 500000],   // 500k VNĐ
    ],

    'max_pending_purchases' => 3,
];
