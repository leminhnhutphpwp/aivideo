<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar_media_id')) {
                $table->foreignId('avatar_media_id')->nullable();
            }
            
            if (Schema::hasTable('media') && Schema::hasColumn('users', 'avatar_media_id')) {
                try {
                    $table->foreign('avatar_media_id')
                        ->references('id')->on('media')
                        ->onDelete('set null');
                } catch (\Exception $e) {
                    // Foreign key already exists or media table doesn't exist
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'avatar_media_id')) {
                try {
                    $table->dropForeign(['avatar_media_id']);
                } catch (\Exception $e) {}
                $table->dropColumn('avatar_media_id');
            }
        });
    }
};
