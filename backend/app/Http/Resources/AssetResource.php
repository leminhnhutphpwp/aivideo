<?php
namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'type' => $this->type,
            'mime_type' => $this->mime_type,
            'original_name' => $this->original_name,
            'size_bytes' => $this->size_bytes,
            'url' => $this->signedUrl(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
