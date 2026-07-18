<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_upgrades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('from_plan_id')->nullable()->constrained('plans')->onDelete('set null');
            $table->unsignedBigInteger('to_plan_id');
            $table->foreign('to_plan_id')->references('id')->on('plans');
            $table->integer('amount'); // Số tiền VNĐ đã chuyển
            $table->string('reference_code')->nullable()->index(); // SePay reference code
            $table->enum('status', ['pending', 'paid', 'cancelled'])->default('pending');
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_upgrades');
    }
};