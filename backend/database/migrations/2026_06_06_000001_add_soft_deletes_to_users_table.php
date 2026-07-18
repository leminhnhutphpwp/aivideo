<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->softDeletes();
        });

        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users DROP INDEX users_email_unique');
            DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_email_unique (email(191), deleted_at)');

            DB::statement('ALTER TABLE users DROP INDEX users_username_unique');
            DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_username_unique (username, deleted_at)');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email, deleted_at)');

            DB::statement('DROP INDEX IF EXISTS users_username_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username, deleted_at)');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement('ALTER TABLE users DROP INDEX users_email_unique');
            DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_email_unique (email(191))');

            DB::statement('ALTER TABLE users DROP INDEX users_username_unique');
            DB::statement('ALTER TABLE users ADD UNIQUE INDEX users_username_unique (username)');
        } elseif ($driver === 'sqlite') {
            DB::statement('DROP INDEX IF EXISTS users_email_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email)');

            DB::statement('DROP INDEX IF EXISTS users_username_unique');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username)');
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
