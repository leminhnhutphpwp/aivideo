<?php
namespace App\Enums;

enum RenderJobStatus: string
{
    case Created = 'created';
    case Queued = 'queued';
    case Validating = 'validating';
    case Rendering = 'rendering';
    case Encoding = 'encoding';
    case Completed = 'completed';
    case Failed = 'failed';
    case Cancelled = 'cancelled';
    case Dead = 'dead';

    public function isTerminal(): bool
    {
        return in_array($this, [
            self::Completed, self::Failed, self::Cancelled, self::Dead,
        ]);
    }

    public function isActive(): bool
    {
        return !$this->isTerminal();
    }
}
