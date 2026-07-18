<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->string('daemon_project_id', 36)->nullable()->after('plan_snapshot');
            $table->string('daemon_task_id', 36)->nullable()->after('daemon_project_id');
        });
    }

    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropColumn(['daemon_project_id', 'daemon_task_id']);
        });
    }
};
