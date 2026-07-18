<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table("assets", function (Blueprint $table) {
            $table->string("storage_location", 50)->nullable()->after("path");
            $table->string("external_url")->nullable()->after("storage_location");
        });
    }

    public function down(): void
    {
        Schema::table("assets", function (Blueprint $table) {
            $table->dropColumn(["storage_location", "external_url"]);
        });
    }
};
