<?php

namespace App\Http\Requests\Pricing;

use Illuminate\Foundation\Http\FormRequest;

class ValidatePricingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'calculation_id' => ['required', 'string', 'min:10'],
            'expected_total' => ['required', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'calculation_id.required' => 'Thiếu calculation ID',
            'calculation_id.exists' => 'Calculation ID không tồn tại hoặc đã hết hạn',
            'expected_total.required' => 'Thiếu tổng giá trị',
            'expected_total.min' => 'Giá trị không hợp lệ',
        ];
    }
}
