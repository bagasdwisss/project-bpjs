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
        // For MySQL, we need to modify the enum values
        DB::statement("ALTER TABLE peserta MODIFY COLUMN periode_pelatihan ENUM('1bulan', '2bulan', '3bulan', '4bulan', '5bulan', '6bulan', '7bulan', '8bulan', '9bulan', '10bulan', '11bulan', '12bulan')");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert to the previous values
        DB::statement("ALTER TABLE peserta MODIFY COLUMN periode_pelatihan ENUM('6bulan', '12bulan')");
    }
};
