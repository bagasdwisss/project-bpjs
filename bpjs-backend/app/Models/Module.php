<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Module extends Model
{
    protected $table = 'modules';
    protected $primaryKey = 'module_id';

    protected $fillable = [
        'module_name',
        'module_description', 
        'max_score',
        'module_order',
        'status'
    ];

    public function scores()
    {
        return $this->hasMany(Score::class, 'module_id', 'module_id');
    }
}