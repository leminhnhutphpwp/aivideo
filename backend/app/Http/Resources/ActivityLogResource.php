<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'uuid' => $this->uuid,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id ? (string) $this->subject_id : null,
            'causer_type' => $this->causer_type,
            'causer_id' => $this->causer_id ? (string) $this->causer_id : null,
            'properties' => $this->properties,
            'created_at' => $this->created_at?->toIso8601String(),
            'causer' => $this->whenLoaded('causer', fn() => [
                'uuid' => $this->causer->uuid ?? null,
                'name' => $this->causer->name ?? null,
            ]),
            'subject' => $this->whenLoaded('subject', fn() => [
                'uuid' => $this->subject->uuid ?? null,
                'name' => $this->subject->name ?? null,
            ]),
        ];
    }
}
