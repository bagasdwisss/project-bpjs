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
        // Check if table doesn't exist before creating
        if (!Schema::hasTable('peserta')) {
            Schema::create('peserta', function (Blueprint $table) {
                $table->id('peserta_id');
                $table->integer('user_id')->index();
                $table->string('nik', 20)->nullable();
                $table->date('tanggal_pendaftaran');
                $table->string('no_telepon', 15)->nullable();
                $table->string('pekerjaan', 100)->nullable();
                $table->string('email', 100)->nullable();
                $table->enum('status_pendaftaran', ['BARU DAFTAR', 'MENUNGGU PEMBAYARAN', 'PEMBAYARAN BERHASIL'])->default('BARU DAFTAR');
                $table->enum('periode_pelatihan', ['6bulan', '12bulan'])->default('6bulan');
                $table->decimal('biaya', 15, 2)->default(0.00);
                $table->string('bukti_pembayaran_link', 255)->nullable();
                $table->string('bukti_sosialisasi_link', 255)->nullable();
                $table->timestamps();

                // Foreign key constraint
                $table->foreign('user_id')->references('user_id')->on('users')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('peserta');
    }
};
