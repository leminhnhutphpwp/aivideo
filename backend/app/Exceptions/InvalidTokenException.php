<?php

namespace App\Exceptions;

use RuntimeException;

class InvalidTokenException extends RuntimeException
{
    protected ?string $token;

    protected ?int $statusCode;

    protected ?array $responseBody;

    public function __construct(
        string $message = '',
        int $code = 0,
        ?\Throwable $previous = null,
        ?string $token = null,
        ?int $statusCode = null,
        ?array $responseBody = null
    ) {
        parent::__construct($message, $code, $previous);

        $this->token = $token;
        $this->statusCode = $statusCode;
        $this->responseBody = $responseBody;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function getStatusCode(): ?int
    {
        return $this->statusCode;
    }

    public function getResponseBody(): ?array
    {
        return $this->responseBody;
    }

    public function isRevoked(): bool
    {
        return str_contains($this->message, 'revoked') ||
               ($this->responseBody['error_description'] ?? '') === 'Token was revoked. You have to re-authorize from the user.';
    }

    public function isExpired(): bool
    {
        return str_contains($this->message, 'expired') ||
               str_contains($this->message, 'invalid_token');
    }

    public function isEmpty(): bool
    {
        return str_contains($this->message, 'empty') || blank($this->token);
    }
}
