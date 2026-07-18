<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->unsignedInteger('total_duration')->nullable()->after('render_mode');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn('total_duration');
        });
    }
};
