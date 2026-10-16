<?php
// app/Http/Controllers/NotificationController.php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;


class NotificationController extends Controller
{
    /**
     * Display a listing of notifications for the authenticated user
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Ambil notifikasi untuk user yang sedang login
            // Ini mencakup:
            // 1. Notifikasi yang langsung ditujukan ke user ini (user_id = user->user_id)
            // 2. Notifikasi yang ditujukan untuk peran user ini (melalui recipients)
            $notificationsQuery = Notification::where('user_id', $user->user_id);
            
            // Jika user adalah peserta, juga ambil notifikasi yang ditujukan untuk peserta
            if ($user->role == 'Peserta') {
                $notificationsQuery->orWhere(function($query) {
                    if (Schema::hasColumn('notifications', 'recipients')) {
                        $query->whereJsonContains('recipients', 'participants')
                              ->orWhereJsonContains('recipients', 'all');
                    }
                });
            }
            
            $notifications = $notificationsQuery->orderBy('created_at', 'desc')
                ->paginate(10); // Batasi 10 notifikasi per halaman
            
            return response()->json([
                'success' => true,
                'data' => $notifications->items(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications: ' . $e->getMessage()
            ], 500);
        }
    }

public function store(Request $request)
{
    // Validasi dasar
    $request->validate([
        'title' => 'required|string|max:100',
        'message' => 'required|string',
    ]);

    try {
        DB::beginTransaction();

        $user = Auth::user();
        
        // DEBUG: Log data sebelum processing
        Log::info('Notification creation started', [
            'user_id' => $user->user_id,
            'request_data' => $request->all(),
            'recipients' => $request->recipients
        ]);

        // Tentukan recipients
        $recipients = $request->recipients ?? ['all'];
        
        $result = null;
        
        // JIKA recipients adalah 'participants', buat notifikasi untuk semua peserta
        if (in_array('participants', $recipients)) {
            // Get all participants
            $participants = User::where('role', 'Peserta')->get();
            
            $createdCount = 0;
            foreach ($participants as $participant) {
                $notificationData = [
                    'user_id' => $participant->user_id, // Gunakan ID peserta
                    'title' => $request->title,
                    'message' => $request->message,
                    'type' => $request->type ?? 'reminder',
                    'priority' => $request->priority ?? 'medium',
                    'due_date' => $request->due_date,
                    'recipients' => ['participants'],
                    'is_read' => false,
                ];

                Notification::create($notificationData);
                $createdCount++;
            }

            $result = [
                'success' => true,
                'message' => 'Notification created successfully for ' . $createdCount . ' participants',
                'data' => [
                    'participants_count' => $createdCount
                ]
            ];
        }
        // JIKA recipients adalah 'coordinators', buat notifikasi untuk semua koordinator
        else if (in_array('coordinators', $recipients)) {
            // Get all coordinators
            $coordinators = User::where('role', 'Koordinator')->get();
            
            $createdCount = 0;
            foreach ($coordinators as $coordinator) {
                $notificationData = [
                    'user_id' => $coordinator->user_id, // Gunakan ID koordinator
                    'title' => $request->title,
                    'message' => $request->message,
                    'type' => $request->type ?? 'reminder',
                    'priority' => $request->priority ?? 'medium',
                    'due_date' => $request->due_date,
                    'recipients' => ['coordinators'],
                    'is_read' => false,
                ];

                Notification::create($notificationData);
                $createdCount++;
            }

            $result = [
                'success' => true,
                'message' => 'Notification created successfully for ' . $createdCount . ' coordinators',
                'data' => [
                    'coordinators_count' => $createdCount
                ]
            ];
        }
        // DEFAULT: Buat notifikasi untuk user yang sedang login (seperti sebelumnya)
        else {
            $notificationData = [
                'user_id' => $user->user_id, // Gunakan user_id bukan id()
                'title' => $request->title,
                'message' => $request->message,
                'type' => $request->type ?? 'reminder',
                'priority' => $request->priority ?? 'medium',
                'due_date' => $request->due_date,
                'recipients' => $recipients,
                'is_read' => false,
            ];

            $notification = Notification::create($notificationData);

            Log::info('Notification created successfully', [
                'notification_id' => $notification->notification_id
            ]);

            $result = [
                'success' => true,
                'message' => 'Notification created successfully',
                'data' => $notification->load('user')
            ];
        }

        DB::commit();

        return response()->json($result, 201);

    } catch (\Exception $e) {
        DB::rollBack();
        Log::error('Error creating notification: ' . $e->getMessage());
        Log::error('Stack trace: ' . $e->getTraceAsString());
        
        return response()->json([
            'success' => false,
            'message' => 'Failed to create notification: ' . $e->getMessage()
        ], 500);
    }
}
    /**
     * Mark a notification as read
     */
    public function markAsRead($id)
    {
        try {
            $user = Auth::user();
            
            // Temukan notifikasi berdasarkan ID dan user_id
            $notification = Notification::where('notification_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found'
                ], 404);
            }
            
            // Update status is_read menjadi true
            $notification->update(['is_read' => true]);
            
            return response()->json([
                'success' => true,
                'message' => 'Notification marked as read',
                'data' => $notification
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking notification as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification as read: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead()
    {
        try {
            $user = Auth::user();
            
            // Update semua notifikasi user menjadi terbaca
            Notification::where('user_id', $user->user_id)
                ->where('is_read', false)
                ->update(['is_read' => true]);
            
            return response()->json([
                'success' => true,
                'message' => 'All notifications marked as read'
            ]);
        } catch (\Exception $e) {
            Log::error('Error marking all notifications as read: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark all notifications as read: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a notification
     */
    public function destroy($id)
    {
        try {
            $user = Auth::user();
            
            // Temukan notifikasi berdasarkan ID dan user_id
            $notification = Notification::where('notification_id', $id)
                ->where('user_id', $user->user_id)
                ->first();
            
            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found'
                ], 404);
            }
            
            // Hapus notifikasi
            $notification->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Clear all read notifications
     */
    public function clearAllRead()
    {
        try {
            $user = Auth::user();
            
            // Hapus semua notifikasi yang sudah dibaca
            Notification::where('user_id', $user->user_id)
                ->where('is_read', true)
                ->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'All read notifications cleared'
            ]);
        } catch (\Exception $e) {
            Log::error('Error clearing read notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to clear read notifications: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get count of unread notifications for the authenticated user
     */
    public function unreadCount()
    {
        try {
            $user = Auth::user();
            
            // Hitung jumlah notifikasi yang belum dibaca
            $count = Notification::where('user_id', $user->user_id)
                ->where('is_read', false)
                ->count();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'unread_count' => $count
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting unread notifications count: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to get unread notifications count: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of notifications for coordinators
     */
    public function coordinatorIndex(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Ambil notifikasi untuk koordinator, bisa berdasarkan user_id atau yang ditujukan untuk koordinator
            $notifications = Notification::where('user_id', $user->user_id)
                ->orWhere(function($query) {
                    // Juga ambil notifikasi yang ditujukan untuk koordinator/admin
                    if (Schema::hasColumn('notifications', 'recipients')) {
                        $query->whereJsonContains('recipients', 'coordinators')
                              ->orWhereJsonContains('recipients', 'all');
                    }
                })
                ->orderBy('created_at', 'desc')
                ->paginate(10);
            
            return response()->json([
                'success' => true,
                'data' => $notifications->items(),
                'pagination' => [
                    'current_page' => $notifications->currentPage(),
                    'last_page' => $notifications->lastPage(),
                    'per_page' => $notifications->perPage(),
                    'total' => $notifications->total(),
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching coordinator notifications: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a notification (coordinator access)
     */
    public function coordinatorDestroy($id)
    {
        try {
            $user = Auth::user();
            
            // Temukan notifikasi berdasarkan ID
            $notification = Notification::where('notification_id', $id)->first();
            
            if (!$notification) {
                return response()->json([
                    'success' => false,
                    'message' => 'Notification not found'
                ], 404);
            }
            
            // Hapus notifikasi
            $notification->delete();
            
            return response()->json([
                'success' => true,
                'message' => 'Notification deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete notification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get participants for notification recipients
     */
    public function getParticipantsForNotification()
    {
        try {
            $participants = User::where('role', 'Peserta')
                ->select('user_id', 'name', 'email')
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $participants
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching participants: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participants: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get reminder settings for coordinators
     */
    public function getReminderSettings()
    {
        try {
            // This is a placeholder implementation
            // In a real application, you would have settings stored in a table
            $settings = [
                'auto_reminders' => true,
                'reminder_time' => '09:00',
                'default_recipients' => ['participants'],
                'notification_types' => ['reminder', 'announcement', 'alert']
            ];
            
            return response()->json([
                'success' => true,
                'data' => $settings
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching reminder settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch reminder settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update reminder settings for coordinators
     */
    public function updateReminderSettings(Request $request)
    {
        try {
            // This is a placeholder implementation
            // In a real application, you would save settings to a database
            $validated = $request->validate([
                'auto_reminders' => 'boolean',
                'reminder_time' => 'string|date_format:H:i',
                'default_recipients' => 'array',
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Reminder settings updated successfully',
                'data' => $validated
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating reminder settings: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update reminder settings: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get scheduled reminders
     */
    public function getScheduledReminders()
    {
        try {
            // For now, return notifications that have due dates
            $now = now();
            $scheduledReminders = Notification::whereNotNull('due_date')
                ->where('due_date', '>=', $now)
                ->orderBy('due_date', 'asc')
                ->limit(10)
                ->get();
            
            return response()->json([
                'success' => true,
                'data' => $scheduledReminders
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching scheduled reminders: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch scheduled reminders: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Broadcast notification to participants
     */
    public function broadcastToParticipants(Request $request)
    {
        try {
            $user = Auth::user();
            
            $request->validate([
                'title' => 'required|string|max:100',
                'message' => 'required|string',
                'type' => 'in:reminder,announcement,alert',
                'priority' => 'in:low,medium,high',
                'due_date' => 'date|nullable',
            ]);

            DB::beginTransaction();

            // Get all participants to broadcast to
            $participants = User::where('role', 'Peserta')->pluck('user_id');
            
            foreach ($participants as $participantId) {
                $notificationData = [
                    'user_id' => $participantId,  // Perbaikan: Gunakan participantId bukan userId koordinator
                    'title' => $request->title,
                    'message' => $request->message,
                    'type' => $request->type ?? 'reminder',
                    'priority' => $request->priority ?? 'medium',
                    'due_date' => $request->due_date,
                    'recipients' => ['participants'],
                    'is_read' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
                
                // Use insert to avoid issues with non-existent columns
                $notificationData = array_filter($notificationData, function($value, $key) {
                    if ($key === 'recipients' && !Schema::hasColumn('notifications', 'recipients')) {
                        return false;
                    }
                    if ($key === 'type' && !Schema::hasColumn('notifications', 'type')) {
                        return false;
                    }
                    if ($key === 'priority' && !Schema::hasColumn('notifications', 'priority')) {
                        return false;
                    }
                    if ($key === 'due_date' && !Schema::hasColumn('notifications', 'due_date')) {
                        return false;
                    }
                    return true;
                }, ARRAY_FILTER_USE_BOTH);
                
                Notification::create($notificationData);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Broadcast notification sent successfully to ' . count($participants) . ' participants',
                'data' => [
                    'participants_count' => count($participants)
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error broadcasting notification: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to broadcast notification: ' . $e->getMessage()
            ], 500);
        }
    }
}