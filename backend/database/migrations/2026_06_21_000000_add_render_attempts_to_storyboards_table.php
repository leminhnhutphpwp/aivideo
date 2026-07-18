<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            // Total render kickoffs (initial render + each retry). Capped by
            // config('storyboard.max_render_attempts') to stop unlimited retries.
            $table->unsignedSmallInteger('render_attempts')->default(0)->after('consistency_score');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn('render_attempts');
        });
    }
};
