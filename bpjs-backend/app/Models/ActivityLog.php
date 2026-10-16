<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs'; // nama tabel
    protected $primaryKey = 'id'; // primary key

    protected $fillable = [
        'user_id',
        'activity_type',
        'details',
        'ip_address',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }
}
