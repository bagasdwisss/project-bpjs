<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\ScoreController;
use App\Http\Controllers\BatchController;
use App\Http\Controllers\ModuleController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ForumController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\GradingController; // <-- TAMBAHKAN INI
use App\Http\Controllers\PesertaController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ==================================================
// PUBLIC ROUTES
// ==================================================

// Route untuk mendapatkan CSRF cookie (misalnya dipakai frontend SPA)
Route::get('/sanctum/csrf-cookie', function (Request $request) {
    return response()->json(['message' => 'CSRF cookie set']);
});

// Login endpoint
Route::post('/login', [AuthController::class, 'login']);

// Resource publik (jika dibutuhkan)
Route::apiResource('users', UserController::class);

// Routes untuk progress peserta
Route::get('/coordinator/participants/progress', [ProgressController::class, 'getCoordinatorParticipantsProgress']);
Route::get('/coordinator/participants/progress-details', [ProgressController::class, 'getCoordinatorParticipantsProgressDetails']);
Route::get('/coordinator/participants/{id}/progress', [ProgressController::class, 'show']);

// ==================================================
// PROTECTED ROUTES (dengan middleware Sanctum)
// ==================================================
Route::middleware('auth:sanctum')->group(function () {
    // ===================== AUTH =====================
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // ===================== GRADING ROUTES (MENGGUNAKAN PROGRESS TABLE) =====================
    Route::prefix('grading')->group(function () {
        // Routes untuk semua yang authenticated (tidak tergantung role)
        Route::get('/participants', [GradingController::class, 'getParticipants']);
        
        // Static routes before dynamic routes to avoid conflicts
        Route::get('/participants/without-progress', [GradingController::class, 'getParticipantsWithoutProgress']);
        Route::get('/participants/{progressId}', [GradingController::class, 'getParticipantDetail']);
        Route::put('/participants/{progressId}/scores', [GradingController::class, 'updateScores']);
        Route::put('/participants/{progressId}/progress', [GradingController::class, 'updateProgress']);
        Route::get('/coordinators', [GradingController::class, 'getCoordinators']);
        Route::get('/configuration', [GradingController::class, 'getGradingConfiguration']);

        // ✅ NEW: peserta tanpa progress & create progress entry - tersedia untuk authenticated user (tidak wajib role:Koordinator)
        Route::post('/participants/create-progress', [GradingController::class, 'createProgressEntry']);

        // Routes khusus Koordinator
        Route::middleware('role:Koordinator')->group(function () {
            // tambahkan route yang hanya untuk Koordinator di sini bila diperlukan
        });

        // Routes untuk Admin
        Route::middleware('role:Administrator')->group(function () {
            Route::get('/admin/participants', [GradingController::class, 'getAllParticipants']);
            Route::get('/admin/participants/{progressId}', [GradingController::class, 'getParticipantDetail']);
            Route::put('/admin/participants/{progressId}/scores', [GradingController::class, 'updateScores']);
            Route::put('/admin/participants/{progressId}/progress', [GradingController::class, 'updateProgress']);
        });
    });

    // ===================== DASHBOARD ROUTES UNTUK SEMUA ROLE =====================
    Route::prefix('dashboard')->group(function () {
        // Dashboard untuk Peserta
        Route::get('/participant', [DashboardController::class, 'participantDashboard'])
            ->middleware('role:Peserta');
        
        // Dashboard untuk Koordinator
        Route::get('/coordinator', [DashboardController::class, 'coordinatorDashboard'])
            ->middleware('role:Koordinator');
        
        // Dashboard untuk Admin
        Route::get('/admin', [DashboardController::class, 'adminDashboard'])
            ->middleware('role:Administrator');
    });

    // ===================== USER ROUTES =====================
    Route::get('/coordinators', [UserController::class, 'getCoordinators']);
    Route::post('/users/import', [UserController::class, 'import']);
    Route::get('/coordinator', [UserController::class, 'getCoordinator']);

    // ===== NEW: USER PROFILE MANAGEMENT =====
    Route::get('/profile', [UserController::class, 'getProfile']);
    Route::put('/profile', [UserController::class, 'updateProfile']);

    // ===== NEW: USER BY ID (untuk dashboard) =====
    Route::get('/users/{id}', [UserController::class, 'getUserById']);

    // ===== NEW: PROGRESS ROUTES (untuk dashboard coordinator) =====
    Route::get('/users/{userId}/progress', [ProgressController::class, 'getUserProgress']);
    Route::put('/users/{userId}/progress', [ProgressController::class, 'updateUserProgress']);

    // ===================== COMMON ROUTES =====================
    // Events
    Route::get('/events/participant', [EventController::class, 'getParticipantEvents']);
    Route::get('/events', [EventController::class, 'getEvents']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{event}', [EventController::class, 'update']);
    Route::delete('/events/{event}', [EventController::class, 'destroy']);

    // Forum
    Route::prefix('forum')->group(function () {
        Route::get('/topics', [ForumController::class, 'getTopics']);
        Route::get('/topics/{id}/messages', [ForumController::class, 'getMessages']);
        Route::post('/topics/{id}/messages', [ForumController::class, 'sendMessage']);
    });

    // ===================== NOTIFICATION ROUTES =====================
    Route::prefix('notifications')->group(function () {
        // Routes umum untuk semua role yang login
        Route::get('/unread-count', [NotificationController::class, 'unreadCount']);

        // ===== PESERTA =====
        Route::middleware('role:Peserta')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::put('/{id}/read', [NotificationController::class, 'markAsRead']);
            Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
            Route::delete('/{id}', [NotificationController::class, 'destroy']);
            Route::delete('/clear/read', [NotificationController::class, 'clearAllRead']);
        });

        // ===== KOORDINATOR =====
        Route::middleware('role:Koordinator')->prefix('coordinator')->group(function () {
            Route::get('/', [NotificationController::class, 'coordinatorIndex']);
            Route::post('/', [NotificationController::class, 'store']);
            Route::post('/broadcast', [NotificationController::class, 'broadcastToParticipants']);
            Route::put('/{id}', [NotificationController::class, 'update']);
            Route::delete('/{id}', [NotificationController::class, 'coordinatorDestroy']);
            Route::get('/participants', [NotificationController::class, 'getParticipantsForNotification']);
            
            // Reminder Settings
            Route::prefix('reminders')->group(function () {
                Route::get('/settings', [NotificationController::class, 'getReminderSettings']);
                Route::post('/settings', [NotificationController::class, 'updateReminderSettings']);
                Route::get('/scheduled', [NotificationController::class, 'getScheduledReminders']);
            });
        });

        // ===== ADMIN =====
        Route::middleware('role:Administrator')->prefix('admin')->group(function () {
            Route::get('/', [NotificationController::class, 'adminIndex']);
            Route::get('/statistics', [NotificationController::class, 'notificationStatistics']);
            
            // Broadcast
            Route::prefix('broadcast')->group(function () {
                Route::post('/send', [NotificationController::class, 'broadcastToAll']);
                Route::get('/history', [NotificationController::class, 'broadcastHistory']);
            });
        });
    });

    // ===================== PESERTA ROUTES =====================
    Route::middleware('role:Peserta')->prefix('participant')->group(function () {
        // Attendance
        Route::prefix('attendance')->group(function () {
            Route::get('/', [AttendanceController::class, 'myAttendance']);
            Route::post('/check-in', [AttendanceController::class, 'checkIn']);
            Route::get('/statistics', [AttendanceController::class, 'myStatistics']);
        });

        // Scores
        Route::prefix('scores')->group(function () {
            Route::get('/', [ScoreController::class, 'myScores']);
            Route::get('/statistics', [ScoreController::class, 'myStatistics']);
        });

        // Documents
        Route::prefix('documents')->group(function () {
            Route::get('/', [DocumentController::class, 'myDocuments']);
            Route::post('/', [DocumentController::class, 'upload']);
            Route::delete('/{id}', [DocumentController::class, 'delete']);
            Route::get('/{id}/download', [DocumentController::class, 'download']);
        });

        // ===== PROGRESS - TAMBAHAN BARU =====
        Route::get('/progress', [ProgressController::class, 'myProgress']);

        // ===== ACQUISITION RESULTS =====
        Route::get('/acquisition-result', [PesertaController::class, 'getAcquisitionResults']);

        // ===== CRUD PESERTA =====
        Route::post('/peserta', [PesertaController::class, 'store']);
        Route::get('/peserta/{id}', [PesertaController::class, 'show']);
        Route::put('/peserta/{id}', [PesertaController::class, 'update']);
        Route::delete('/peserta/{id}', [PesertaController::class, 'destroy']);

        // ===== UPLOAD PROOF =====
        Route::post('/acquisition-result/{id}/upload-payment-proof', [PesertaController::class, 'uploadPaymentProof']);
        Route::post('/acquisition-result/{id}/upload-socialization-proof', [PesertaController::class, 'uploadSocializationProof']);
        Route::put('/acquisition-result/{id}/confirm-payment', [PesertaController::class, 'confirmPayment']);
    });

    // ===================== KOORDINATOR ROUTES =====================
    Route::middleware('role:Koordinator')->prefix('coordinator')->group(function () {
        Route::get('/participants', [UserController::class, 'getParticipantsByCoordinator']);

        // Participants management
        Route::prefix('participants')->group(function () {
            Route::get('/', [UserController::class, 'getMyParticipants']);
            Route::get('/{id}', [UserController::class, 'getParticipantDetail']);
            Route::get('/{id}/scores', [ScoreController::class, 'getParticipantScores']);
            Route::get('/{id}/attendance', [AttendanceController::class, 'getParticipantAttendance']);
            
            // ===== PROGRESS - TAMBAHAN BARU =====
            Route::get('/{id}/progress', [ProgressController::class, 'show']);
            
            // ===== NEW: BULK GET PROGRESS (untuk dashboard) =====
            Route::get('/progress', [ProgressController::class, 'getCoordinatorParticipantsProgress']);
        });

        // Grading
        Route::prefix('scores')->group(function () {
            Route::post('/', [ScoreController::class, 'store']);
            Route::put('/{id}', [ScoreController::class, 'update']);
            Route::delete('/{id}', [ScoreController::class, 'delete']);
        });

        // ===== PROGRESS MANAGEMENT - TAMBAHAN BARU =====
        Route::prefix('progress')->group(function () {
            Route::get('/', [ProgressController::class, 'index']); // List semua progress participant koordinator
            Route::post('/', [ProgressController::class, 'store']); // Buat progress baru
            Route::put('/{id}', [ProgressController::class, 'update']); // Update progress
            Route::delete('/{id}', [ProgressController::class, 'destroy']); // Hapus progress
        });

        // Analysis
        Route::prefix('analysis')->group(function () {
            Route::get('/performance', [ScoreController::class, 'performanceAnalysis']);
            Route::get('/attendance', [AttendanceController::class, 'attendanceAnalysis']);
            Route::get('/progress', [UserController::class, 'progressAnalysis']);
        });

        // Certificates
        Route::prefix('certificates')->group(function () {
            Route::post('/generate', [ReportController::class, 'generateCertificate']);
            Route::get('/history', [ReportController::class, 'certificateHistory']);
        });
    });

    // ===================== ADMIN ROUTES =====================
    Route::middleware('role:Administrator')->prefix('admin')->group(function () {
        // User management
        Route::prefix('users')->group(function () {
            Route::get('/', [UserController::class, 'index']);
            Route::post('/', [UserController::class, 'store']);
            Route::get('/{id}', [UserController::class, 'show']);
            Route::put('/{id}', [UserController::class, 'update']);
            Route::delete('/{id}', [UserController::class, 'destroy']);
            Route::post('/import', [UserController::class, 'import']);
            Route::get('/export', [UserController::class, 'export']);
            
            // ===== PROGRESS - TAMBAHAN BARU =====
            Route::get('/{id}/progress', [ProgressController::class, 'show']);
        });

        // ===== PROGRESS MANAGEMENT - TAMBAHAN BARU =====
        Route::prefix('progress')->group(function () {
            Route::get('/', [ProgressController::class, 'adminIndex']); // List semua progress
            Route::post('/', [ProgressController::class, 'store']); // Buat progress baru
            Route::get('/{id}', [ProgressController::class, 'showById']); // Detail progress by ID
            Route::put('/{id}', [ProgressController::class, 'update']); // Update progress
            Route::delete('/{id}', [ProgressController::class, 'destroy']); // Hapus progress
        });

        // Batch management
        Route::prefix('batches')->group(function () {
            Route::get('/', [BatchController::class, 'index']);
            Route::post('/', [BatchController::class, 'store']);
            Route::get('/{id}', [BatchController::class, 'show']);
            Route::put('/{id}', [BatchController::class, 'update']);
            Route::delete('/{id}', [BatchController::class, 'destroy']);
            Route::post('/{id}/assign-users', [BatchController::class, 'assignUsers']);
        });

        // Module management
        Route::prefix('modules')->group(function () {
            Route::get('/', [ModuleController::class, 'index']);
            Route::post('/', [ModuleController::class, 'store']);
            Route::put('/{id}', [ModuleController::class, 'update']);
            Route::delete('/{id}', [ModuleController::class, 'destroy']);
        });

        // Reports
        Route::prefix('reports')->group(function () {
            Route::post('/generate', [ReportController::class, 'generate']);
            Route::get('/history', [ReportController::class, 'history']);
            Route::get('/{id}/download', [ReportController::class, 'download']);
        });

        // Import/Export
        Route::prefix('data')->group(function () {
            Route::post('/import', [UserController::class, 'importData']);
            Route::get('/export', [UserController::class, 'exportData']);
            Route::get('/templates', [UserController::class, 'getTemplates']);
        });

        // Monitoring
        Route::prefix('monitoring')->group(function () {
            Route::get('/activity-logs', [UserController::class, 'getActivityLogs']);
            Route::get('/system-stats', [UserController::class, 'getSystemStats']);
            Route::get('/active-users', [UserController::class, 'getActiveUsers']);
        });

        // Backup
        Route::prefix('backup')->group(function () {
            Route::post('/create', [ReportController::class, 'createBackup']);
            Route::get('/list', [ReportController::class, 'listBackups']);
            Route::post('/{id}/restore', [ReportController::class, 'restoreBackup']);
            Route::get('/{id}/download', [ReportController::class, 'downloadBackup']);
        });
    });
});