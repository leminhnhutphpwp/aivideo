<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->string('render_mode')->default('multi_scene')->after('status');
            $table->text('compiled_prompt')->nullable()->after('render_mode');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn(['compiled_prompt', 'render_mode']);
        });
    }
};
