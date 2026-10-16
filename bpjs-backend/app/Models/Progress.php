<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Progress extends Model
{
    use HasFactory;

    protected $table = 'progress';
    
    protected $fillable = [
        'user_id',
        'kunjungan_bpu',
        'hasil_akuisisi_bpu',
        'kunjungan_pu',
        'video_viralisasi',
        'kehadiran_seminar',
        'kehadiran_sosialisasi',
        'total_poin',
        'nilai',
        'grade'
    ];

    protected $casts = [
        'kunjungan_bpu' => 'integer',
        'hasil_akuisisi_bpu' => 'integer',
        'kunjungan_pu' => 'integer',
        'video_viralisasi' => 'integer',
        'kehadiran_seminar' => 'integer',
        'kehadiran_sosialisasi' => 'integer',
        'total_poin' => 'decimal:2',
        'nilai' => 'decimal:2',
    ];

    // Relasi ke User
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    // Method untuk menghitung field yang dihitung - updated to match Google Sheets system
    public function updateCalculatedFields()
    {
        // === TARGETS - Sesuaikan dengan Google Sheets ===
        $targets = [
            "MAX_KUNJUNGAN_BPU" => 30,
            "MAX_AKUISISI_BPU" => 20,
            "MAX_KUNJUNGAN_PU" => 7,
            "TARGET_VIDEO" => 1,
            "TARGET_SEMINAR" => 2,
            "TARGET_SOSIALISASI" => 1
        ];

        // === BOBOT PENILAIAN - Sesuaikan dengan Google Sheets ===
        $bobot = [
            "AKUISISI_BPU" => 0.30,       // 30% - Bobot tertinggi
            "KUNJUNGAN_BPU" => 0.20,      // 20%
            "KUNJUNGAN_PU" => 0.15,       // 15%
            "VIDEO" => 0.15,              // 15%
            "SEMINAR" => 0.10,            // 10%
            "SOSIALISASI" => 0.10         // 10%
            // Total: 1.0 atau 100%
        ];

        // Hitung persentase pencapaian (maksimal 100%)
        $persenKunjunganBPU = min(100, ($this->kunjungan_bpu / $targets["MAX_KUNJUNGAN_BPU"]) * 100);
        $persenAkuisisiBPU = min(100, ($this->hasil_akuisisi_bpu / $targets["MAX_AKUISISI_BPU"]) * 100);
        $persenKunjunganPU = min(100, ($this->kunjungan_pu / $targets["MAX_KUNJUNGAN_PU"]) * 100);
        $persenVideo = min(100, ($this->video_viralisasi / $targets["TARGET_VIDEO"]) * 100);
        $persenSeminar = min(100, ($this->kehadiran_seminar / $targets["TARGET_SEMINAR"]) * 100);
        $persenSosialisasi = min(100, ($this->kehadiran_sosialisasi / $targets["TARGET_SOSIALISASI"]) * 100);

        // Hitung nilai dengan bobot
        $nilaiKunjunganBPU = $persenKunjunganBPU * $bobot["KUNJUNGAN_BPU"];
        $nilaiAkuisisiBPU = $persenAkuisisiBPU * $bobot["AKUISISI_BPU"];
        $nilaiKunjunganPU = $persenKunjunganPU * $bobot["KUNJUNGAN_PU"];
        $nilaiVideo = $persenVideo * $bobot["VIDEO"];
        $nilaiSeminar = $persenSeminar * $bobot["SEMINAR"];
        $nilaiSosialisasi = $persenSosialisasi * $bobot["SOSIALISASI"];

        $this->total_poin = $nilaiKunjunganBPU + $nilaiAkuisisiBPU + $nilaiKunjunganPU + $nilaiVideo + $nilaiSeminar + $nilaiSosialisasi;
        $this->nilai = $this->total_poin;  // Total point is the final score
        
        // Calculate grade based on score
        $this->grade = $this->calculateGrade($this->nilai);
    }

    // Method to calculate grade based on score
    private function calculateGrade($score)
    {
        if ($score >= 85) return "A";
        if ($score >= 80) return "B+";
        if ($score >= 75) return "B";
        if ($score >= 70) return "C+";
        if ($score >= 65) return "C";
        if ($score >= 50) return "D";
        return "E";
    }

    // Method to update only calculated fields (for when progress components are updated)
    public function updateCalculatedFieldsOnly()
    {
        // Calculate scores based on the updated components
        $this->updateCalculatedFields();
        
        // Save the calculated values to the database
        $this->save();
    }
}