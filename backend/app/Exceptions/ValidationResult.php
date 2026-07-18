<?php
namespace App\Exceptions;

class ValidationResult
{
    public function __construct(
        private bool $passed,
        private array $errors = []
    ) {}

    public function passes(): bool
    {
        return $this->passed;
    }

    public function fails(): bool
    {
        return !$this->passed;
    }

    public function errors(): array
    {
        return $this->errors;
    }
}
