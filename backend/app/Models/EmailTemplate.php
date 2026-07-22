<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class EmailTemplate extends Model
{
    use LogsActivity;

    protected $guarded = ['id', 'created_at', 'updated_at'];

    protected $casts = [
        'placeholders' => 'array',
        'is_html' => 'boolean',
        'enabled' => 'boolean',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logAll()
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }

    public function render(array $data = []): array
    {
        // Build replacement map for a single-pass substitution (strtr) so that a
        // value which itself contains "{{another_key}}" is never re-substituted by
        // a later pass. URL values are kept raw; all other user-supplied values are
        // HTML-escaped because the body is sent via Mail::html (raw HTML).
        $replacements = [];
        foreach ($data as $key => $value) {
            $value = (string) $value;
            $isUrl = str_ends_with($key, '_url') || str_ends_with($key, 'url');
            $replacements['{{' . $key . '}}'] = $isUrl ? $value : e($value);
        }

        return [
            'subject' => strtr($this->subject, $replacements),
            'body' => strtr($this->body, $replacements),
        ];
    }
}
