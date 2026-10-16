<?php
// app/Models/Notification.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class Notification extends Model
{
    use HasFactory;

    protected $primaryKey = 'notification_id';
    public $timestamps = true;

    // Tentukan fillable berdasarkan kolom yang ada di database
    protected $fillable = [
        'user_id',
        'title',
        'message',
        'type',
        'priority', 
        'due_date',
        'recipients',
        'is_read'
    ];

    protected $casts = [
        'due_date' => 'date',
        'is_read' => 'boolean',
        'recipients' => 'array'
    ];

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        
        // Dynamically set fillable based on actual columns
        $this->fillable = $this->getActualFillable();
    }

    /**
     * Get fillable columns based on actual database structure
     */
    protected function getActualFillable()
    {
        $columns = Schema::getColumnListing('notifications');
        $defaultFillable = ['user_id', 'title', 'message', 'is_read'];
        
        $actualFillable = array_intersect($this->fillable, $columns);
        
        return !empty($actualFillable) ? $actualFillable : $defaultFillable;
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'user_id');
    }

    // Scope untuk filter berdasarkan role
    public function scopeForRole($query, $role)
    {
        $roleMapping = [
            'Peserta' => 'participants',
            'Koordinator' => 'coordinators', 
            'Administrator' => 'coordinators'
        ];

        $recipientType = $roleMapping[$role] ?? 'all';
        
        // Cek dulu apakah kolom recipients ada
        if (Schema::hasColumn('notifications', 'recipients')) {
            return $query->whereJsonContains('recipients', $recipientType)
                        ->orWhereJsonContains('recipients', 'all');
        }
        
        // Jika tidak ada kolom recipients, return semua
        return $query;
    }

    public function scopeUnread($query)
    {
        if (Schema::hasColumn('notifications', 'is_read')) {
            return $query->where('is_read', false);
        }
        
        return $query;
    }

    // Accessor untuk handle kolom yang mungkin tidak ada
    public function getTypeAttribute($value)
    {
        if (!Schema::hasColumn('notifications', 'type')) {
            return 'reminder';
        }
        return $value ?? 'reminder';
    }

    public function getPriorityAttribute($value)
    {
        if (!Schema::hasColumn('notifications', 'priority')) {
            return 'medium';
        }
        return $value ?? 'medium';
    }

    public function getRecipientsAttribute($value)
    {
        if (!Schema::hasColumn('notifications', 'recipients')) {
            return ['all'];
        }
        
        if ($value) {
            return json_decode($value, true) ?? ['all'];
        }
        
        return ['all'];
    }
}