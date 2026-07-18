<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->foreignId('parent_scene_id')->nullable()->after('scene_number')
                ->references('id')->on('storyboard_scenes')->nullOnDelete();
            $table->string('edge_label', 255)->nullable()->after('parent_scene_id');
            $table->float('position_x')->nullable()->default(0)->after('edge_label');
            $table->float('position_y')->nullable()->default(0)->after('position_x');

            $table->index('parent_scene_id');
        });
    }

    public function down(): void
    {
        Schema::table('storyboard_scenes', function (Blueprint $table) {
            $table->dropIndex(['parent_scene_id']);
            $table->dropForeign(['parent_scene_id']);
            $table->dropColumn(['parent_scene_id', 'edge_label', 'position_x', 'position_y']);
        });
    }
};
