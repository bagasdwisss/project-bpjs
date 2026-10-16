<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Score extends Model
{
    use HasFactory;

    protected $table = 'scores';
    
    protected $fillable = [
        'user_id',
        'module_id',
        'score_value',
        'max_score',
        'comments',
        'graded_at'
    ];

    protected $casts = [
        'score_value' => 'integer',
        'max_score' => 'integer',
        'graded_at' => 'datetime'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    public function module()
    {
        return $this->belongsTo(Module::class, 'module_id', 'module_id');
    }
}