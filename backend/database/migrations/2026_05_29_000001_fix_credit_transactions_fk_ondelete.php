<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropForeign(['render_job_id']);
            $table->dropUnique('uniq_job_type');
        });

        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->foreign('render_job_id')->references('id')->on('render_jobs')->nullOnDelete();
            $table->unique(['render_job_id', 'type'], 'uniq_job_type');
        });
    }

    public function down(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropForeign(['render_job_id']);
            $table->dropUnique('uniq_job_type');
        });

        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->foreign('render_job_id')->references('id')->on('render_jobs');
            $table->unique(['render_job_id', 'type'], 'uniq_job_type');
        });
    }
};
