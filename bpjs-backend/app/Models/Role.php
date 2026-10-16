<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $table = 'roles';
    protected $primaryKey = 'role_id'; // Using role_id as the primary key as shown in the error and seeder

    public $timestamps = false; // jika tabel roles tidak punya created_at/updated_at

    protected $fillable = [
        'role_name',
        'description'
    ];

    // Accessor to allow using 'role_name' which maps to the 'role_name' column
    public function getRoleNameAttribute()
    {
        return $this->attributes['role_name'] ?? null;
    }
    
    // Mutator to allow setting 'role_name' which maps to the 'role_name' column
    public function setRoleNameAttribute($value)
    {
        $this->attributes['role_name'] = $value;
    }

    public function users()
    {
        return $this->hasMany(User::class, 'role_id', 'role_id');
    }
}
