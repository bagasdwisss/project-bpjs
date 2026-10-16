<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Peserta extends Model
{
    use HasFactory;

    protected $table = 'peserta';
    
    protected $primaryKey = 'peserta_id';
    
    public $incrementing = true;
    
    protected $keyType = 'int';
    
    protected $fillable = [
        'user_id',
        'nama_peserta',
        'nik',
        'tanggal_pendaftaran',
        'no_telepon',
        'pekerjaan',
        'email',
        'status_pendaftaran',
        'periode_pelatihan',
        'biaya',
        'bukti_pembayaran_link',
        'bukti_sosialisasi_link',
        'program_terdaftar',
    ];

    protected $casts = [
        'tanggal_pendaftaran' => 'date',
        'biaya' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the peserta.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}