<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\AttendanceRecord;
use App\Models\Score;
use App\Models\Event;
use App\Models\Module;
use App\Models\Notification;
use App\Models\Batch;
use App\Models\Progress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class DashboardController extends Controller
{
    // Konfigurasi Targets - SESUAI DENGAN KODE GOOGLE APPS SCRIPT
    private $TARGETS = [
        "MAX_KUNJUNGAN_BPU" => 30,
        "MAX_AKUISISI_BPU" => 20,
        "MAX_KUNJUNGAN_PU" => 7,
        "TARGET_VIDEO" => 1,
        "TARGET_SEMINAR" => 2,
        "TARGET_SOSIALISASI" => 1
    ];

    // Bobot Penilaian - SESUAI DENGAN KODE GOOGLE APPS SCRIPT
    private $BOBOT = [
        "AKUISISI_BPU" => 0.30,       // 30% - Bobot tertinggi
        "KUNJUNGAN_BPU" => 0.20,      // 20%
        "KUNJUNGAN_PU" => 0.15,       // 15%
        "VIDEO" => 0.15,              // 15%
        "SEMINAR" => 0.10,            // 10%
        "SOSIALISASI" => 0.10         // 10%
        // Total: 1.0 atau 100%
    ];

    /**
     * Get Participant Dashboard Data
     */
    public function participantDashboard(Request $request)
    {
        try {
            $user = $request->user();
            $userId = $user->user_id;
            
            // Verify user exists and get required data safely
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated properly'
                ], 401);
            }
            
            // Get current month and year
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;
            
            // 1. ATTENDANCE STATISTICS
            $attendanceStats = $this->getAttendanceStats($userId, $currentMonth, $currentYear);
            
            // 2. SCORE STATISTICS
            $scoreStats = $this->getScoreStats($userId);
            
            // 3. PROGRESS STATISTICS (Akuisisi BPU) dengan perhitungan nilai
            $progressStats = $this->getProgressStats($userId);
            
            // 4. RECENT SCORES (Last 4)
            $recentScores = $this->getRecentScores($userId);
            
            // 5. UPCOMING EVENTS (Next 3)
            $upcomingEvents = $this->getUpcomingEvents();
            
            // 6. MODULE PROGRESS
            $moduleProgress = $this->getModuleProgress($userId);
            
            // 7. UNREAD NOTIFICATIONS COUNT
            $unreadNotifications = Notification::where('user_id', $userId)
                ->where('is_read', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => [
                        'attendance' => $attendanceStats,
                        'averageScore' => $scoreStats['average'],
                        'maxScore' => $scoreStats['max'],
                        'minScore' => $scoreStats['min'],
                        'totalScores' => $scoreStats['total'],
                        'rank' => $scoreStats['rank'],
                        'totalParticipants' => $scoreStats['totalParticipants'],
                        'completedModules' => $progressStats['completed_modules'],
                        'totalModules' => $progressStats['total_modules'],
                        'akuisisiBPU' => $progressStats['akuisisi_bpu'],
                        'hasilAkuisisiBPU' => $progressStats['hasil_akuisisi_bpu'],
                        'kunjunganPU' => $progressStats['kunjungan_pu'],
                        'videoViralisasi' => $progressStats['video_viralisasi'],
                        'kehadiranSeminar' => $progressStats['kehadiran_seminar'],
                        'kehadiranSosialisasi' => $progressStats['kehadiran_sosialisasi'],
                        'nilai' => $progressStats['nilai'],
                        'grade' => $progressStats['grade'],
                        'totalPoin' => $progressStats['total_poin'],
                    ],
                    'recent_scores' => $recentScores,
                    'upcoming_events' => $upcomingEvents,
                    'module_progress' => $moduleProgress['details'],
                    'unread_notifications' => $unreadNotifications,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Dashboard error: ' . $e->getMessage(), [
                'user_id' => $request->user()->user_id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Attendance Statistics - DIPERBAIKI (tanpa ringkasan total)
     */
    private function getAttendanceStats($userId, $month, $year)
    {
        try {
            // Check user's placement first
            $user = User::find($userId);
            if (!$user || $user->penempatan === 'lapangan') {
                // For "lapangan" users, return zero attendance stats
                return [
                    'percentage' => 0,
                    'present' => 0,
                    'izin' => 0,
                    'sick' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'effectivePresent' => 0,
                    'total' => 0,
                    'month' => Carbon::create($year, $month)->format('F Y')
                ];
            }

            $attendances = AttendanceRecord::where('user_id', $userId)
                ->whereMonth('attendance_date', $month)
                ->whereYear('attendance_date', $year)
                ->get();

            $total = $attendances->count();
            
            // PERHITUNGAN SESUAI ATURAN BARU:
            // - Hadir: status 'Hadir'
            // - Izin: status 'Izin' (dihitung sebagai hadir)
            // - Sakit: status 'Sakit' 
            // - Alpa: status 'Alpa'
            // - Terlambat: status 'Terlambat' (dihitung sebagai tidak hadir)
            
            $present = $attendances->where('status', 'Hadir')->count();
            $izin = $attendances->where('status', 'Izin')->count();
            $sick = $attendances->where('status', 'Sakit')->count();
            $absent = $attendances->where('status', 'Alpa')->count();
            $late = $attendances->where('status', 'Terlambat')->count();
            
            // Total hadir efektif (Hadir + Izin)
            $effectivePresent = $present + $izin;
            
            $percentage = $total > 0 ? round(($effectivePresent / $total) * 100, 2) : 0;

            return [
                'percentage' => $percentage,
                'present' => $present,
                'izin' => $izin,
                'sick' => $sick,
                'absent' => $absent,
                'late' => $late,
                'effectivePresent' => $effectivePresent,
                'total' => $total,
                'month' => Carbon::create($year, $month)->format('F Y')
            ];
        } catch (\Exception $e) {
            Log::error('Attendance stats error: ' . $e->getMessage(), [
                'user_id' => $userId,
                'month' => $month,
                'year' => $year
            ]);
            
            return [
                'percentage' => 0,
                'present' => 0,
                'izin' => 0,
                'sick' => 0,
                'absent' => 0,
                'late' => 0,
                'effectivePresent' => 0,
                'total' => 0,
                'month' => Carbon::create($year, $month)->format('F Y')
            ];
        }
    }

    /**
     * Get Score Statistics
     */
    private function getScoreStats($userId)
    {
        try {
            $scores = Score::where('user_id', $userId)->get();

            $average = $scores->count() > 0 ? round($scores->avg('score_value'), 2) : 0;
            $max = $scores->count() > 0 ? $scores->max('score_value') : 0;
            $min = $scores->count() > 0 ? $scores->min('score_value') : 0;
            $total = $scores->count();

            // Calculate rank among active participants
            $allParticipants = User::where('role_id', 1) // Assuming role_id 1 is peserta
                ->where('status', 'Aktif')
                ->pluck('user_id')
                ->toArray();

            $participantAverages = [];
            foreach ($allParticipants as $participantId) {
                $participantScores = Score::where('user_id', $participantId)->get();
                if ($participantScores->count() > 0) {
                    $participantAvg = $participantScores->avg('score_value');
                    $participantAverages[] = [
                        'user_id' => $participantId,
                        'average' => $participantAvg
                    ];
                }
            }

            // Sort by average descending
            usort($participantAverages, function($a, $b) {
                return $b['average'] <=> $a['average'];
            });

            // Find user rank
            $rank = 0;
            foreach ($participantAverages as $index => $participant) {
                if ($participant['user_id'] == $userId) {
                    $rank = $index + 1;
                    break;
                }
            }

            return [
                'average' => $average,
                'max' => $max,
                'min' => $min,
                'total' => $total,
                'rank' => $rank > 0 ? $rank : '-',
                'totalParticipants' => count($participantAverages)
            ];
        } catch (\Exception $e) {
            Log::error('Score stats error: ' . $e->getMessage(), [
                'user_id' => $userId
            ]);
            
            return [
                'average' => 0,
                'max' => 0,
                'min' => 0,
                'total' => 0,
                'rank' => '-',
                'totalParticipants' => 0
            ];
        }
    }

    /**
     * Get Progress Statistics (Akuisisi BPU) - DIPERBAIKI dengan update database
     */
    private function getProgressStats($userId)
    {
        try {
            $progress = Progress::where('user_id', $userId)->first();
            
            if ($progress) {
                // Hitung modul yang sudah diselesaikan berdasarkan progress
                $completed = 0;
                $totalModules = 6; // Total modul: kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi
                
                // Setiap modul dianggap selesai jika nilai > 0
                if ($progress->kunjungan_bpu > 0) $completed++;
                if ($progress->hasil_akuisisi_bpu > 0) $completed++;
                if ($progress->kunjungan_pu > 0) $completed++;
                if ($progress->video_viralisasi > 0) $completed++;
                if ($progress->kehadiran_seminar > 0) $completed++;
                if ($progress->kehadiran_sosialisasi > 0) $completed++;
                
                // HITUNG NILAI DAN GRADE BERDASARKAN LOGIKA GOOGLE APPS SCRIPT
                $nilaiData = $this->calculateNilai($progress);
                
                // UPDATE NILAI DI DATABASE agar konsisten
                $this->updateProgressNilai($progress, $nilaiData);
                
                return [
                    'completed_modules' => $completed,
                    'total_modules' => $totalModules,
                    'akuisisi_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'nilai' => $nilaiData['nilai_akhir'],
                    'grade' => $nilaiData['grade'],
                    'total_poin' => $nilaiData['total_poin'],
                ];
            }
            
            // Return default values jika tidak ada progress
            return [
                'completed_modules' => 0,
                'total_modules' => 6,
                'akuisisi_bpu' => 0,
                'hasil_akuisisi_bpu' => 0,
                'kunjungan_pu' => 0,
                'video_viralisasi' => 0,
                'kehadiran_seminar' => 0,
                'kehadiran_sosialisasi' => 0,
                'nilai' => 0,
                'grade' => 'E',
                'total_poin' => 0,
            ];
            
        } catch (\Exception $e) {
            Log::error('Progress stats error: ' . $e->getMessage(), [
                'user_id' => $userId
            ]);
            
            return [
                'completed_modules' => 0,
                'total_modules' => 6,
                'akuisisi_bpu' => 0,
                'hasil_akuisisi_bpu' => 0,
                'kunjungan_pu' => 0,
                'video_viralisasi' => 0,
                'kehadiran_seminar' => 0,
                'kehadiran_sosialisasi' => 0,
                'nilai' => 0,
                'grade' => 'E',
                'total_poin' => 0,
            ];
        }
    }

    /**
     * Calculate Nilai dan Grade berdasarkan logika Google Apps Script
     */
    private function calculateNilai($progress)
    {
        // Hitung persentase pencapaian (maksimal 100%)
        $persenKunjunganBPU = min(100, ($progress->kunjungan_bpu / $this->TARGETS["MAX_KUNJUNGAN_BPU"]) * 100);
        $persenAkuisisiBPU = min(100, ($progress->hasil_akuisisi_bpu / $this->TARGETS["MAX_AKUISISI_BPU"]) * 100);
        $persenKunjunganPU = min(100, ($progress->kunjungan_pu / $this->TARGETS["MAX_KUNJUNGAN_PU"]) * 100);
        $persenVideo = min(100, ($progress->video_viralisasi / $this->TARGETS["TARGET_VIDEO"]) * 100);
        $persenSeminar = min(100, ($progress->kehadiran_seminar / $this->TARGETS["TARGET_SEMINAR"]) * 100);
        $persenSosialisasi = min(100, ($progress->kehadiran_sosialisasi / $this->TARGETS["TARGET_SOSIALISASI"]) * 100);

        // Hitung nilai dengan bobot
        $nilaiKunjunganBPU = $persenKunjunganBPU * $this->BOBOT["KUNJUNGAN_BPU"];
        $nilaiAkuisisiBPU = $persenAkuisisiBPU * $this->BOBOT["AKUISISI_BPU"];
        $nilaiKunjunganPU = $persenKunjunganPU * $this->BOBOT["KUNJUNGAN_PU"];
        $nilaiVideo = $persenVideo * $this->BOBOT["VIDEO"];
        $nilaiSeminar = $persenSeminar * $this->BOBOT["SEMINAR"];
        $nilaiSosialisasi = $persenSosialisasi * $this->BOBOT["SOSIALISASI"];

        $totalPoin = $nilaiKunjunganBPU + $nilaiAkuisisiBPU + $nilaiKunjunganPU + $nilaiVideo + $nilaiSeminar + $nilaiSosialisasi;
        $nilaiAkhir = $totalPoin;
        $grade = $this->calculateGrade($nilaiAkhir);

        return [
            'total_poin' => round($totalPoin, 2),
            'nilai_akhir' => round($nilaiAkhir, 2),
            'grade' => $grade
        ];
    }

    /**
     * Update nilai di database agar konsisten
     */
    private function updateProgressNilai($progress, $nilaiData)
    {
        try {
            // Cek apakah perlu update (jika ada perubahan)
            if ($progress->total_poin != $nilaiData['total_poin'] || 
                $progress->nilai != $nilaiData['nilai_akhir'] || 
                $progress->grade != $nilaiData['grade']) {
                
                $progress->update([
                    'total_poin' => $nilaiData['total_poin'],
                    'nilai' => $nilaiData['nilai_akhir'],
                    'grade' => $nilaiData['grade'],
                    'updated_at' => now()
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error updating progress nilai: ' . $e->getMessage(), [
                'progress_id' => $progress->id,
                'user_id' => $progress->user_id
            ]);
        }
    }

    /**
     * Fungsi untuk menentukan Grade berdasarkan skor - SESUAI DENGAN KODE GOOGLE APPS SCRIPT
     */
    private function calculateGrade($score)
    {
        if ($score >= 85) return "A";
        if ($score >= 80) return "B+";
        if ($score >= 75) return "B";
        if ($score >= 70) return "C+";
        if ($score >= 65) return "C";
        if ($score >= 50) return "D";
        return "E";
    }

    /**
     * Get Recent Scores
     */
    private function getRecentScores($userId)
    {
        try {
            $scores = Score::where('user_id', $userId)
                ->orderBy('created_at', 'desc')
                ->limit(4)
                ->get();

            return $scores->map(function($score) {
                return [
                    'module_name' => $score->module_name ?? 'Module',
                    'score_value' => (float) $score->score_value,
                    'max_score' => (float) $score->max_score,
                    'comments' => $score->comments,
                    'graded_at' => $score->created_at ? Carbon::parse($score->created_at)->format('d M Y') : 'N/A'
                ];
            });
        } catch (\Exception $e) {
            Log::error('Error getting recent scores: ' . $e->getMessage(), [
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return collect([]);
        }
    }

    /**
     * Get Upcoming Events
     */
    private function getUpcomingEvents()
    {
        try {
            $events = Event::where('start_datetime', '>=', Carbon::now())
                ->orderBy('start_datetime', 'asc')
                ->limit(3)
                ->get();

            return $events->map(function($event) {
                return [
                    'event_id' => $event->event_id,
                    'event_title' => $event->event_title,
                    'event_description' => $event->event_description,
                    'start_datetime' => Carbon::parse($event->start_datetime)->format('d M Y, H:i'),
                    'end_datetime' => Carbon::parse($event->end_datetime)->format('d M Y, H:i'),
                    'batch_name' => $event->batch->batch_name ?? 'Unknown Batch'
                ];
            });
        } catch (\Exception $e) {
            Log::error('Error getting upcoming events: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return collect([]);
        }
    }

    /**
     * Get Module Progress
     */
    private function getModuleProgress($userId)
    {
        try {
            $scores = Score::where('user_id', $userId)->get();

            $details = $scores->map(function($score) {
                $percentage = $score->max_score > 0 
                    ? round(($score->score_value / $score->max_score) * 100, 2) 
                    : 0;
                
                return [
                    'module_name' => $score->module_name ?? 'Module',
                    'score_value' => (float) $score->score_value,
                    'max_score' => (float) $score->max_score,
                    'percentage' => $percentage
                ];
            });

            return [
                'completed' => $scores->count(),
                'total' => $scores->count(), // Atau jumlah total modul yang tersedia
                'details' => $details
            ];
        } catch (\Exception $e) {
            Log::error('Error getting module progress: ' . $e->getMessage(), [
                'user_id' => $userId,
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'completed' => 0,
                'total' => 0,
                'details' => collect([])
            ];
        }
    }

    /**
     * Get Coordinator Dashboard Data
     */
    public function coordinatorDashboard(Request $request)
    {
        try {
            $user = $request->user();
            $userId = $user->user_id;
            
            // Verify user exists and get required data safely
            if (!$userId) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated properly'
                ], 401);
            }

            // 1. GET COORDINATOR'S PARTICIPANTS
            $participants = User::where('coordinator_id', $userId)
                ->where('role_id', 1) // Role peserta
                ->where('status', 'Aktif')
                ->get();

            $totalParticipants = $participants->count();

            // 2. GET OVERALL STATISTICS
            $overallStats = $this->getCoordinatorOverallStats($userId);

            // 3. GET RECENT ACTIVITIES
            $recentActivities = $this->getCoordinatorRecentActivities($userId);

            // 4. GET UPCOMING EVENTS
            $upcomingEvents = $this->getUpcomingEvents();

            // 5. UNREAD NOTIFICATIONS COUNT
            $unreadNotifications = Notification::where('user_id', $userId)
                ->where('is_read', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => [
                        'totalParticipants' => $totalParticipants,
                        'averageAttendance' => $overallStats['average_attendance'],
                        'averageScore' => $overallStats['average_score'],
                        'completedProgress' => $overallStats['completed_progress'],
                        'pendingTasks' => $overallStats['pending_tasks'],
                    ],
                    'participants' => $participants->map(function($participant) {
                        return [
                            'user_id' => $participant->user_id,
                            'full_name' => $participant->full_name,
                            'email' => $participant->email,
                            'status' => $participant->status,
                        ];
                    }),
                    'recent_activities' => $recentActivities,
                    'upcoming_events' => $upcomingEvents,
                    'unread_notifications' => $unreadNotifications,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Coordinator Dashboard error: ' . $e->getMessage(), [
                'user_id' => $request->user()->user_id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load coordinator dashboard data: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Coordinator Overall Statistics
     */
    private function getCoordinatorOverallStats($coordinatorId)
    {
        try {
            // Get coordinator's participants
            $participants = User::where('coordinator_id', $coordinatorId)
                ->where('role_id', 1)
                ->where('status', 'Aktif')
                ->pluck('user_id')
                ->toArray();

            if (empty($participants)) {
                return [
                    'average_attendance' => 0,
                    'average_score' => 0,
                    'completed_progress' => 0,
                    'pending_tasks' => 0,
                ];
            }

            // Calculate average attendance
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;
            
            $totalAttendancePercentage = 0;
            $participantsWithAttendance = 0;

            foreach ($participants as $participantId) {
                $attendanceStats = $this->getAttendanceStats($participantId, $currentMonth, $currentYear);
                if ($attendanceStats['total'] > 0) {
                    $totalAttendancePercentage += $attendanceStats['percentage'];
                    $participantsWithAttendance++;
                }
            }

            $averageAttendance = $participantsWithAttendance > 0 ? 
                round($totalAttendancePercentage / $participantsWithAttendance, 2) : 0;

            // Calculate average score
            $totalScores = Score::whereIn('user_id', $participants)->get();
            $averageScore = $totalScores->count() > 0 ? 
                round($totalScores->avg('score_value'), 2) : 0;

            // Calculate completed progress
            $totalProgress = Progress::whereIn('user_id', $participants)->get();
            $completedProgress = 0;
            
            foreach ($totalProgress as $progress) {
                $completed = 0;
                $totalModules = 6;
                
                if ($progress->kunjungan_bpu > 0) $completed++;
                if ($progress->hasil_akuisisi_bpu > 0) $completed++;
                if ($progress->kunjungan_pu > 0) $completed++;
                if ($progress->video_viralisasi > 0) $completed++;
                if ($progress->kehadiran_seminar > 0) $completed++;
                if ($progress->kehadiran_sosialisasi > 0) $completed++;
                
                $completedProgress += ($completed / $totalModules) * 100;
            }

            $averageCompletedProgress = count($participants) > 0 ? 
                round($completedProgress / count($participants), 2) : 0;

            // Calculate pending tasks (participants without recent progress)
            $pendingTasks = 0;
            $oneWeekAgo = Carbon::now()->subWeek();
            
            foreach ($participants as $participantId) {
                $recentProgress = Progress::where('user_id', $participantId)
                    ->where('updated_at', '>=', $oneWeekAgo)
                    ->exists();
                
                if (!$recentProgress) {
                    $pendingTasks++;
                }
            }

            return [
                'average_attendance' => $averageAttendance,
                'average_score' => $averageScore,
                'completed_progress' => $averageCompletedProgress,
                'pending_tasks' => $pendingTasks,
            ];

        } catch (\Exception $e) {
            Log::error('Coordinator overall stats error: ' . $e->getMessage());
            return [
                'average_attendance' => 0,
                'average_score' => 0,
                'completed_progress' => 0,
                'pending_tasks' => 0,
            ];
        }
    }

    /**
     * Get Coordinator Recent Activities
     */
    private function getCoordinatorRecentActivities($coordinatorId)
    {
        try {
            // Get coordinator's participants
            $participants = User::where('coordinator_id', $coordinatorId)
                ->where('role_id', 1)
                ->pluck('user_id')
                ->toArray();

            if (empty($participants)) {
                return collect([]);
            }

            // Get recent attendance records
            $recentAttendances = AttendanceRecord::whereIn('user_id', $participants)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($attendance) {
                    return [
                        'type' => 'attendance',
                        'user_name' => $attendance->user->full_name ?? 'Unknown',
                        'activity' => 'Check-in ' . $attendance->status,
                        'time' => $attendance->created_at->format('d M Y H:i'),
                    ];
                });

            // Get recent score updates
            $recentScores = Score::whereIn('user_id', $participants)
                ->with('user')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($score) {
                    return [
                        'type' => 'score',
                        'user_name' => $score->user->full_name ?? 'Unknown',
                        'activity' => 'Nilai baru: ' . $score->score_value,
                        'time' => $score->created_at->format('d M Y H:i'),
                    ];
                });

            // Combine and sort by time
            $allActivities = $recentAttendances->merge($recentScores)
                ->sortByDesc('time')
                ->values()
                ->take(5);

            return $allActivities;

        } catch (\Exception $e) {
            Log::error('Coordinator recent activities error: ' . $e->getMessage());
            return collect([]);
        }
    }

    /**
     * Get Admin Dashboard Data - IMPLEMENTASI LENGKAP
     */
    public function adminDashboard(Request $request)
    {
        try {
            // 1. GET SYSTEM OVERVIEW STATISTICS
            $systemStats = $this->getAdminSystemStats();

            // 2. GET RECENT ACTIVITIES
            $recentActivities = $this->getAdminRecentActivities();

            // 3. GET UPCOMING EVENTS
            $upcomingEvents = $this->getUpcomingEvents();

            // 4. UNREAD NOTIFICATIONS COUNT
            $user = $request->user();
            $unreadNotifications = Notification::where('user_id', $user->user_id)
                ->where('is_read', 0)
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'stats' => [
                        'totalUsers' => $systemStats['total_users'],
                        'activeParticipants' => $systemStats['active_participants'],
                        'totalCoordinators' => $systemStats['total_coordinators'],
                        'totalBatches' => $systemStats['total_batches'],
                        'systemHealth' => $systemStats['system_health'],
                    ],
                    'recent_activities' => $recentActivities,
                    'upcoming_events' => $upcomingEvents,
                    'unread_notifications' => $unreadNotifications,
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Admin Dashboard error: ' . $e->getMessage(), [
                'user_id' => $request->user()->user_id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to load admin dashboard data: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Admin System Statistics
     */
    private function getAdminSystemStats()
    {
        try {
            $totalUsers = User::count();
            $activeParticipants = User::where('role_id', 1)->where('status', 'Aktif')->count();
            $totalCoordinators = User::where('role_id', 2)->count(); // Assuming role_id 2 is coordinator
            $totalBatches = Batch::count();

            // Simple system health calculation (you can make this more sophisticated)
            $systemHealth = 95; // Placeholder - could be based on error logs, performance, etc.

            return [
                'total_users' => $totalUsers,
                'active_participants' => $activeParticipants,
                'total_coordinators' => $totalCoordinators,
                'total_batches' => $totalBatches,
                'system_health' => $systemHealth,
            ];

        } catch (\Exception $e) {
            Log::error('Admin system stats error: ' . $e->getMessage());
            return [
                'total_users' => 0,
                'active_participants' => 0,
                'total_coordinators' => 0,
                'total_batches' => 0,
                'system_health' => 0,
            ];
        }
    }

    /**
     * Get Admin Recent Activities
     */
    private function getAdminRecentActivities()
    {
        try {
            // Get recent user registrations
            $recentUsers = User::with('role')
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($user) {
                    return [
                        'type' => 'user',
                        'activity' => 'User baru: ' . $user->full_name . ' (' . ($user->role->role_name ?? 'Unknown') . ')',
                        'time' => $user->created_at->format('d M Y H:i'),
                    ];
                });

            // Get recent batch creations
            $recentBatches = Batch::orderBy('created_at', 'desc')
                ->limit(5)
                ->get()
                ->map(function($batch) {
                    return [
                        'type' => 'batch',
                        'activity' => 'Batch baru: ' . $batch->batch_name,
                        'time' => $batch->created_at->format('d M Y H:i'),
                    ];
                });

            // Combine and sort by time
            $allActivities = $recentUsers->merge($recentBatches)
                ->sortByDesc('time')
                ->values()
                ->take(5);

            return $allActivities;

        } catch (\Exception $e) {
            Log::error('Admin recent activities error: ' . $e->getMessage());
            return collect([]);
        }
    }
}