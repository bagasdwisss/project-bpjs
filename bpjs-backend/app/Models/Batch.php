<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Batch extends Model
{
    protected $table = 'batches';
    protected $primaryKey = 'batch_id';

    protected $fillable = [
        'batch_name',
        'batch_description',
        'start_date',
        'end_date',
        'status'
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function events()
    {
        return $this->hasMany(Event::class, 'batch_id', 'batch_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'user_batch', 'batch_id', 'user_id');
    }
}