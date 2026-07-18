<?php
namespace App\Exceptions;

use Illuminate\Http\JsonResponse;

class PlanLimitExceededException extends RenderJobException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }

    public function render(): JsonResponse
    {
        return response()->json([
            'error' => 'plan_limit_exceeded',
            'message' => $this->getMessage(),
        ], 403);
    }
}
