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
        Schema::create('progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users', 'user_id')->onDelete('cascade');
            $table->integer('kunjungan_bpu')->default(0);
            $table->integer('hasil_akuisisi_bpu')->default(0);
            $table->integer('kunjungan_pu')->default(0);
            $table->integer('video_viralisasi')->default(0);
            $table->integer('kehadiran_seminar')->default(0);
            $table->integer('kehadiran_sosialisasi')->default(0);
            $table->integer('total_poin')->default(0);
            $table->integer('nilai')->default(0);
            $table->char('grade', 1)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('progress');
    }
};