<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\QualityTier;
use Illuminate\Validation\Rule;

class CreateRenderJobRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prompt' => ['required', 'string', 'min:10', 'max:2000'],
            'negative_prompt' => ['nullable', 'string', 'max:500'],
            'capability' => ['nullable', 'string', 'in:t2v,i2v,r2v,video-edit,character-anim'],
            'video_type' => ['nullable', 'string', 'in:text_to_video,image_to_video,reference_to_video,video_editing,character_animation'],
            'quality_tier' => ['nullable', 'string', 'in:standard,premium,ultra'],
            'duration_seconds' => ['required', 'integer', 'min:1', 'max:60'],
            'aspect_ratio' => ['string', 'in:16:9,9:16,1:1,4:3,21:9'],
            'resolution' => ['string', 'in:720p,1080p'],
            'parameters.style' => ['string', 'nullable'],
            'parameters.camera_movement' => ['string', 'nullable'],
            'reference_images' => ['array', 'max:5'],
            'reference_images.*' => ['url'],
        ];
    }
}
