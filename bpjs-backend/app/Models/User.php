<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'users';
    protected $primaryKey = 'user_id';
    public $timestamps = true;

    protected $fillable = [
        'unique_id',
        'full_name',
        'password_hash',
        'role_id',
        'coordinator_id',
        'status',
        'penempatan'
    ];

    protected $hidden = [
        'password_hash'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Relasi ke tabel progress (1:1)
     */
    public function progress()
    {
        return $this->hasOne(Progress::class, 'user_id', 'user_id');
    }

    /**
     * Relasi ke coordinator (user yang membimbing)
     */
    public function coordinator()
    {
        return $this->belongsTo(User::class, 'coordinator_id', 'user_id');
    }

    /**
     * Relasi ke participants (user yang dibimbing oleh koordinator)
     */
    public function participants()
    {
        return $this->hasMany(User::class, 'coordinator_id', 'user_id');
    }

    /**
     * Relasi ke tabel scores
     */
    public function scores()
    {
        return $this->hasMany(Score::class, 'user_id', 'user_id');
    }

    /**
     * Relasi ke tabel attendances (untuk kompatibilitas lama)
     */
    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'user_id', 'user_id');
    }

    /**
     * Relasi ke tabel attendance_records (versi baru dari kode tambahan)
     */
    public function attendanceRecords()
    {
        return $this->hasMany(AttendanceRecord::class, 'user_id', 'user_id');
    }

    /**
     * Relasi ke tabel roles (penting untuk AuthController)
     */
    public function role()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * Akses role name langsung sebagai atribut (contoh: $user->role_name)
     */
    public function getRoleNameAttribute()
    {
        $roles = [
            1 => 'participant',
            2 => 'coordinator',
            3 => 'admin'
        ];

        return $roles[$this->role_id] ?? 'unknown';
    }

    /**
     * Accessor agar full_name selalu memiliki nilai default
     */
    public function getFullNameAttribute($value)
    {
        return $value ?? 'Nama Tidak Tersedia';
    }

    /**
     * Override untuk autentikasi agar pakai password_hash
     */
    public function getAuthPassword()
    {
        return $this->password_hash;
    }
}
