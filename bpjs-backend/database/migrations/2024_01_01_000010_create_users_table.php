<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id(); // Menggunakan id() standar lebih direkomendasikan
            $table->string('name', 100); // Mengubah 'name' agar konsisten
            $table->string('email', 100)->unique();
            $table->string('password'); 
            $table->unsignedBigInteger('role_id')->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('avatar')->nullable();
            $table->string('status', 20)->default('active');

            // --- KOLOM BARU YANG DITAMBAHKAN ---
            $table->string('coordinator')->nullable()->after('status');

            $table->timestamps();
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};