<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->text('progress_message')->nullable()->after('error_message');
            $table->string('daemon_project_id')->nullable()->after('progress_message');
            $table->string('daemon_task_id')->nullable()->after('daemon_project_id');
        });
    }

    public function down(): void
    {
        Schema::table('storyboards', function (Blueprint $table) {
            $table->dropColumn(['progress_message', 'daemon_project_id', 'daemon_task_id']);
        });
    }
};
