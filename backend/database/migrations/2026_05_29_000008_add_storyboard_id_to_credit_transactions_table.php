<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->foreignId('storyboard_id')->nullable()->after('render_job_id')->constrained()->nullOnDelete();
            $table->index('storyboard_id');
        });
    }

    public function down(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropIndex(['storyboard_id']);
            $table->dropConstrainedForeignId('storyboard_id');
        });
    }
};
