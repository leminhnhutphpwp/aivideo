<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->unsignedInteger('seed')->nullable()->after('resolution');
        });
    }

    public function down(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->dropColumn('seed');
        });
    }
};
