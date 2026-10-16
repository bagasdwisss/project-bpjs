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
        // Add created_at and updated_at columns if they don't exist
        if (!Schema::hasColumn('notifications', 'created_at')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->timestamp('created_at')->nullable()->after('recipients');
            });
        }
        
        if (!Schema::hasColumn('notifications', 'updated_at')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['created_at', 'updated_at']);
        });
    }
};
