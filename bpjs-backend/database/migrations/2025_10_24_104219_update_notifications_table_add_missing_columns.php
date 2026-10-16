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
        // Check if columns exist before adding them to avoid errors
        if (!Schema::hasColumn('notifications', 'type')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('type', ['reminder', 'announcement', 'alert'])->default('reminder')->after('message');
            });
        }
        
        if (!Schema::hasColumn('notifications', 'priority')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->enum('priority', ['low', 'medium', 'high'])->default('medium')->after('type');
            });
        }
        
        if (!Schema::hasColumn('notifications', 'due_date')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->date('due_date')->nullable()->after('priority');
            });
        }
        
        if (!Schema::hasColumn('notifications', 'recipients')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->json('recipients')->nullable()->after('due_date'); // ['all', 'participants', 'coordinators']
            });
        }
        
        // Make sure timestamps exist
        if (!Schema::hasColumn('notifications', 'created_at')) {
            Schema::table('notifications', function (Blueprint $table) {
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropColumn(['type', 'priority', 'due_date', 'recipients']);
        });
    }
};
