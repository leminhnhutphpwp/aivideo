<?php

// PHPUnit processes <php> settings BEFORE the bootstrap file.
// But <env> only calls putenv(), which does NOT update $_ENV/$_SERVER.
// Laravel's env() checks $_ENV > $_SERVER > getenv(), so Docker values
// in $_ENV/$_SERVER take precedence over PHPUnit's putenv().
//
// This bootstrap:
// 1. Clears Docker-level values from $_ENV/$_SERVER for all test-relevant vars
// 2. Sets the correct test values in $_ENV/$_SERVER
// 3. Loads the composer autoloader

$testEnv = [
    'APP_ENV' => 'testing',
    'APP_MAINTENANCE_DRIVER' => 'file',
    'BCRYPT_ROUNDS' => '4',
    'CACHE_STORE' => 'array',
    'DB_CONNECTION' => 'sqlite',
    'DB_DATABASE' => ':memory:',
    'MAIL_MAILER' => 'array',
    'PULSE_ENABLED' => 'false',
    'QUEUE_CONNECTION' => 'sync',
    'SESSION_DRIVER' => 'array',
    'TELESCOPE_ENABLED' => 'false',
];

// PHPUnit's <php> settings were already processed (putenv calls made).
// Now override $_ENV/$_SERVER so Laravel's env() finds the test values.
foreach ($testEnv as $key => $value) {
    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
    putenv("$key=$value");
}

require __DIR__ . '/../vendor/autoload.php';
