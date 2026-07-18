<?php
namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

abstract class RenderJobException extends Exception
{
    abstract public function render(): JsonResponse;
}
