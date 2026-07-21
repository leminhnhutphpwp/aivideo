<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Harden SePay webhook idempotency: reference_code is the payment-gateway
 * dedupe key, so a UNIQUE index turns a concurrent double-credit race into a
 * duplicate-key error at the DB level (last line of defence behind the
 * lockForUpdate re-check in SePayWebhookListener::handleCreditsPurchase).
 *
 * On MySQL a UNIQUE index still permits multiple NULLs, so the nullable
 * reference_code (unset until a webhook pays a row) stays valid.
 *
 * Pre-flight duplicate check (2026-07-21) returned 0 rows on BOTH
 * credit_transactions and pending_credit_purchases, so promoting to UNIQUE is
 * safe. If a future run finds dupes, this migration would fail — dedupe first.
 */
return new class extends Migration
{
    public function up(): void
    {
        // credit_transactions: replace the existing plain index with a UNIQUE one.
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropIndex('credit_transactions_reference_code_index');
        });
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->unique('reference_code', 'credit_transactions_reference_code_unique');
        });

        // pending_credit_purchases: had no index at all — add UNIQUE.
        Schema::table('pending_credit_purchases', function (Blueprint $table) {
            $table->unique('reference_code', 'pending_credit_purchases_reference_code_unique');
        });
    }

    public function down(): void
    {
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->dropUnique('credit_transactions_reference_code_unique');
        });
        Schema::table('credit_transactions', function (Blueprint $table) {
            $table->index('reference_code', 'credit_transactions_reference_code_index');
        });

        Schema::table('pending_credit_purchases', function (Blueprint $table) {
            $table->dropUnique('pending_credit_purchases_reference_code_unique');
        });
    }
};
