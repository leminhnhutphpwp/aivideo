<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            // Payment-gateway reference (e.g. SePay referenceCode) for webhook idempotency.
            // Replaces the LIKE %code% full-scan on `description`.
            $table->string('reference_code')->nullable()->after('description');
            $table->index('reference_code', 'credit_transactions_reference_code_index');
        });
    }

    public function down(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropIndex('credit_transactions_reference_code_index');
            $table->dropColumn('reference_code');
        });
    }
};
