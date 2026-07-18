<?php

namespace App\Http\Requests\Pricing;

use App\Models\VideoType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListPackagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'video_type' => [
                'nullable',
                'string',
                Rule::in(VideoType::active()->pluck('code')->toArray())
            ],
            'limit' => [
                'nullable',
                'integer',
                'min:1',
                'max:50'
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'video_type.in' => 'Loại video không hợp lệ',
            'limit.min' => 'Giới hạn tối thiểu là 1',
            'limit.max' => 'Giới hạn tối đa là 50',
        ];
    }
}
