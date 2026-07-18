<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('video_type_pricings');
        Schema::dropIfExists('pricing_addons');
    }

    public function down(): void
    {
    }
};
