<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Moderation review state for published assets. Separate from `status` (render lifecycle)
     * and `visibility` (feed placement). A degraded image-moderation verdict routes a publish to
     * `pending_review` so it is held out of the public feed until an admin approves it.
     */
    public function up(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->string('moderation_status', 20)->default('approved')->after('visibility');
            $table->timestamp('moderated_at')->nullable()->after('moderation_status');
            $table->index('moderation_status');
        });
    }

    public function down(): void
    {
        Schema::table('render_jobs', function (Blueprint $table) {
            $table->dropIndex(['moderation_status']);
            $table->dropColumn(['moderation_status', 'moderated_at']);
        });
    }
};
