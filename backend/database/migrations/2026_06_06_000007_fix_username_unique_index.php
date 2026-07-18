<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            // The soft-deletes migration (2026_06_06_000001) already creates this
            // composite index on a clean forward migration, so guard against the
            // duplicate-key error (SQLSTATE 1061) to stay idempotent.
            $exists = DB::select(
                "SHOW INDEX FROM users WHERE Key_name = 'users_username_unique'"
            );
            if (empty($exists)) {
                DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_username_unique (username, deleted_at)');
            }
        } elseif ($driver === 'sqlite') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username, deleted_at)');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users DROP INDEX users_username_unique');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_username_unique');
        }
    }
};
