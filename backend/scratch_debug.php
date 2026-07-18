<?php

$files = [
  'docs/plans/completed/pricing/admin-tables-audit.md',
  'docs/plans/completed/pricing/merge-provider-pricing-into-video-type.md',
  'docs/plans/completed/billing/pricing-review.md',
  'docs/plans/completed/billing/pricing-softening-strategy.md',
  'docs/plans/completed/billing/pricing-softening-summary.md',
  'docs/plans/completed/billing/pricing-analysis.md',
  'docs/plans/completed/billing/final-pricing-plan.md',
  'docs/plans/completed/billing/profitable-pricing-strategy.md',
  'docs/plans/completed/billing/pricing-margin-analysis.md'
];

$basePath = '/var/www/';

foreach ($files as $file) {
    $fullPath = $basePath . $file;
    if (file_exists($fullPath)) {
        $content = file_get_contents($fullPath);
        
        // Let's replace the link
        if (str_contains($content, 'rearchitect_plan_unify_model_and_provider_config.md')) {
            $updatedContent = str_replace(
                '[rearchitect_plan_unify_model_and_provider_config.md](file:///home/minhnhut/.gemini/antigravity-cli/brain/834e59c0-9adc-4b27-aaa6-2701513eb03d/rearchitect_plan_unify_model_and_provider_config.md)',
                '[rearchitect-plan-unify-model-and-provider-config.md](file:///home/minhnhut/DataSwap/www/AIVideoPaltfom/docs/plans/completed/pricing/rearchitect-plan-unify-model-and-provider-config.md)',
                $content
            );
            file_put_contents($fullPath, $updatedContent);
            echo "Successfully updated warning link in: {$file}\n";
        } else {
            // If the warning is not present at all, let's insert it
            $warningText = "> [!WARNING]\n" .
                           "> **TÀI LIỆU CŨ / LEGACY DOCUMENT**\n" .
                           "> Tài liệu này mô tả kiến trúc định giá dựa trên `QualityTier` và `ProviderPricing` cũ. \n" .
                           "> Hiện tại, hệ thống đã được tái cấu trúc để **hợp nhất toàn bộ cấu hình Model & Provider trực tiếp vào từng Gói dịch vụ (Plan)**.\n" .
                           "> Vui lòng tham khảo thiết kế mới tại: [rearchitect-plan-unify-model-and-provider-config.md](file:///home/minhnhut/DataSwap/www/AIVideoPaltfom/docs/plans/completed/pricing/rearchitect-plan-unify-model-and-provider-config.md).\n\n";
            file_put_contents($fullPath, $warningText . $content);
            echo "Inserted new warning into: {$file}\n";
        }
    } else {
        echo "File not found: {$file}\n";
    }
}
