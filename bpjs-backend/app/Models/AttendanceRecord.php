<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceRecord extends Model
{
    use HasFactory;

    protected $table = 'attendance_records';
    
    protected $primaryKey = 'attendance_id';
    
    protected $fillable = [
        'user_id',
        'attendance_date',
        'check_in_time',
        'status',
        'notes',
        'gps_location',
        'full_name'
    ];

    protected $casts = [
        'attendance_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    // Accessor untuk mendapatkan full_name dari user jika kosong
    public function getFullNameAttribute($value)
    {
        if (!empty($value)) {
            return $value;
        }
        
        // Jika full_name kosong, ambil dari relasi user
        if ($this->user && $this->user->full_name) {
            return $this->user->full_name;
        }
        
        return 'N/A';
    }
}