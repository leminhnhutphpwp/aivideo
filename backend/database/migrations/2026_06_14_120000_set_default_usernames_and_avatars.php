<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Set default username for users with null username
        // Format: user_<first 8 chars of uuid>
        DB::table('users')
            ->whereNull('username')
            ->orWhere('username', '')
            ->orderBy('id')
            ->each(function ($user) {
                $shortUuid = substr($user->uuid, 0, 8);
                DB::table('users')
                    ->where('id', $user->id)
                    ->update(['username' => "user_{$shortUuid}"]);
            });
    }

    public function down(): void
    {
        // No rollback — usernames are permanent
    }
};
