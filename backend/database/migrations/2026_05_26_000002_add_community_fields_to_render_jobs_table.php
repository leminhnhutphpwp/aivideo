<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->enum('visibility', ['private', 'sharing', 'public'])->default('private')->after('status');
            $table->timestamp('published_at')->nullable()->after('visibility');
            $table->unsignedInteger('creator_payout')->nullable()->after('published_at');
            $table->unsignedInteger('usage_count')->default(0)->after('creator_payout');
            $table->json('tags')->nullable()->after('usage_count');
            $table->index(['visibility', 'status', 'published_at'], 'idx_community_discover');
        });
    }

    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropIndex('idx_community_discover');
            $table->dropColumn(['visibility', 'published_at', 'creator_payout', 'usage_count', 'tags']);
        });
    }
};
