<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plan_upgrades', function (Blueprint $table) {
            $table->string('transfer_code', 20)->unique()->nullable()->after('reference_code');
        });
    }

    public function down(): void
    {
        Schema::table('plan_upgrades', function (Blueprint $table) {
            $table->dropColumn('transfer_code');
        });
    }
};
