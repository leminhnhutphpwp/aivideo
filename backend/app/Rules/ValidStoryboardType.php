<?php

namespace App\Rules;

use App\Services\StoryboardTypeService;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class ValidStoryboardType implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $service = app(StoryboardTypeService::class);

        if (!$service->isValidType($value)) {
            $validIds = implode(', ', $service->getTypeIds());

            $fail("The selected {$attribute} is invalid. Valid types: {$validIds}");
        }
    }
}
