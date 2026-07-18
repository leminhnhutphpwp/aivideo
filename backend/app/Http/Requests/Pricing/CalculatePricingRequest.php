<?php

namespace App\Http\Requests\Pricing;

use App\Models\VideoType;
use App\Models\DurationTier;
use App\Models\ResolutionPricing;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CalculatePricingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authenticated via middleware
    }

    public function rules(): array
    {
        return [
            'video_type' => [
                'required',
                'string',
                Rule::in(VideoType::active()->pluck('code')->toArray())
            ],
            'duration' => [
                'required',
                'string',
                Rule::in(DurationTier::active()->pluck('code')->toArray())
            ],
            'resolution' => [
                'required',
                'string',
                Rule::in(ResolutionPricing::active()->pluck('code')->toArray())
            ],
            'quality' => [
                'required',
                'string',
                'in:standard,premium,ultra'
            ],
            'provider' => [
                'nullable',
                'string',
                'in:qwencloud,ckey,elevenlabs,cloudflare,stub'
            ],
            'provider_model' => [
                'nullable',
                'string',
                'max:100'
            ],
            'quantity' => [
                'nullable',
                'integer',
                'min:1',
                'max:100'
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'video_type.required' => 'Vui lòng chọn loại video',
            'video_type.in' => 'Loại video không hợp lệ',
            'duration.required' => 'Vui lòng chọn thời lượng',
            'duration.in' => 'Thời lượng không hợp lệ',
            'resolution.required' => 'Vui lòng chọn độ phân giải',
            'resolution.in' => 'Độ phân giải không hợp lệ',
            'quality.required' => 'Vui lòng chọn chất lượng',
            'quality.in' => 'Chất lượng không hợp lệ',
            'provider.in' => 'Provider không hợp lệ',
            'quantity.min' => 'Số lượng tối thiểu là 1',
            'quantity.max' => 'Số lượng tối đa là 100',
        ];
    }

    public function attributes(): array
    {
        return [
            'video_type' => 'loại video',
            'duration' => 'thời lượng',
            'resolution' => 'độ phân giải',
            'quality' => 'chất lượng',
            'provider' => 'nhà cung cấp',
            'provider_model' => 'model',
            'quantity' => 'số lượng',
        ];
    }
}
