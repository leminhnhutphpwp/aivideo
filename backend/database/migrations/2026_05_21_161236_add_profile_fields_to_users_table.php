<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_number', 20)->nullable()->comment('Số điện thoại');
            $table->date('date_of_birth')->nullable()->comment('Ngày sinh');
            $table->string('gender', 20)->nullable()->comment('Giới tính: male, female, other');
            $table->text('address')->nullable()->comment('Địa chỉ');
            $table->string('blood_type', 5)->nullable()->comment('Nhóm máu: A, B, AB, O +/+ or -/-');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone_number', 'date_of_birth', 'gender', 'address', 'blood_type']);
        });
    }
};
