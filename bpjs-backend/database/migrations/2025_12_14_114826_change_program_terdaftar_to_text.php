<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add new column to store multiple programs
        Schema::table('peserta', function (Blueprint $table) {
            $table->text('program_terdaftar_new')->nullable()->after('nama_peserta');
        });

        // Copy existing data from old column to new column
        DB::table('peserta')->update([
            'program_terdaftar_new' => DB::raw('program_terdaftar')
        ]);

        // Drop old column and rename new column
        Schema::table('peserta', function (Blueprint $table) {
            $table->dropColumn('program_terdaftar');
        });

        Schema::table('peserta', function (Blueprint $table) {
            $table->renameColumn('program_terdaftar_new', 'program_terdaftar');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back the old enum column
        Schema::table('peserta', function (Blueprint $table) {
            $table->enum('program_terdaftar_old', ['JKK', 'JKM', 'JHT'])->nullable()->after('nama_peserta');
        });

        // Copy data back (use first value if multiple values were stored)
        $pesertas = DB::table('peserta')->get();
        foreach ($pesertas as $peserta) {
            $singleValue = $peserta->program_terdaftar ? explode(',', $peserta->program_terdaftar)[0] : null;
            DB::table('peserta')
                ->where('peserta_id', $peserta->peserta_id)
                ->update(['program_terdaftar_old' => $singleValue]);
        }

        // Drop the text column and rename enum column back
        Schema::table('peserta', function (Blueprint $table) {
            $table->dropColumn('program_terdaftar');
        });

        Schema::table('peserta', function (Blueprint $table) {
            $table->renameColumn('program_terdaftar_old', 'program_terdaftar');
        });
    }
};
