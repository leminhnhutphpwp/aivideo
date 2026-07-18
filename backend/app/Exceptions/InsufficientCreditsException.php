<?php
namespace App\Exceptions;

use Illuminate\Http\JsonResponse;

class InsufficientCreditsException extends RenderJobException
{
    public function __construct(
        public int $required,
        public int $balance
    ) {
        parent::__construct('Insufficient credits');
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'insufficient_credits',
            'required' => $this->required,
            'balance' => $this->balance,
        ], 402);
    }
}
