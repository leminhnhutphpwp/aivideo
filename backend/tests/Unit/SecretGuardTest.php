<?php

namespace Tests\Unit;

use App\Support\SecretGuard;
use PHPUnit\Framework\TestCase;
use RuntimeException;

/**
 * WS2.3 — production boot guard against default/placeholder secrets.
 */
class SecretGuardTest extends TestCase
{
    public function test_flags_empty_and_placeholder_values_as_insecure(): void
    {
        $this->assertTrue(SecretGuard::isInsecure(null));
        $this->assertTrue(SecretGuard::isInsecure(''));
        $this->assertTrue(SecretGuard::isInsecure('   '));
        $this->assertTrue(SecretGuard::isInsecure('change-me'));
        $this->assertTrue(SecretGuard::isInsecure('CHANGE_ME'));
        $this->assertTrue(SecretGuard::isInsecure('your-secret-key'));
        $this->assertTrue(SecretGuard::isInsecure('placeholder'));
    }

    public function test_accepts_a_real_random_secret(): void
    {
        $this->assertFalse(SecretGuard::isInsecure('9f2c1a7b4e8d3061aa5c2f9e7d4b1088'));
        $this->assertFalse(SecretGuard::isInsecure(base64_encode(random_bytes(32))));
    }

    public function test_assert_throws_on_insecure_secret(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessageMatches('/JWT_SECRET/');

        SecretGuard::assert([
            'JWT_SECRET' => 'change-me',
            'DAEMON_WEBHOOK_SECRET' => 'a-real-strong-secret-value-123456',
        ]);
    }

    public function test_assert_passes_when_all_secrets_are_secure(): void
    {
        SecretGuard::assert([
            'JWT_SECRET' => 'a-real-strong-secret-value-123456',
            'DAEMON_WEBHOOK_SECRET' => base64_encode(random_bytes(32)),
        ]);

        $this->addToAssertionCount(1);
    }
}
