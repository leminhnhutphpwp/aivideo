<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('quality_tiers', function (Blueprint $table) {
            $table->json('model_mapping')->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('quality_tiers', function (Blueprint $table) {
            $table->dropColumn('model_mapping');
        });
    }
};
