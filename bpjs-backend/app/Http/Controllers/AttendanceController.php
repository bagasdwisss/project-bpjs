<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\AttendanceRecord;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use App\Services\AttendanceService;

class AttendanceController extends Controller
{
    protected $attendanceService;

    /**
     * Constructor dengan AttendanceService
     */
    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    /**
     * Check in (versi dari kode tambahan kamu)
     */
    public function checkIn(Request $request)
    {
        try {
            $user = Auth::user();

            // Check placement - if user is from "lapangan", disable attendance
            if ($user->penempatan === 'lapangan') {
                return response()->json([
                    'success' => false,
                    'message' => 'Absen tidak tersedia untuk anak lapangan'
                ], 400);
            }

            // Validasi input
            $request->validate([
                'notes' => 'nullable|string|max:500',
                'gps_location' => 'nullable|string'
            ]);

            // ⚡ UBAH JAM DISINI - Contoh: 07:00 sampai 09:00
            $currentTime = Carbon::now();
            $currentHour = $currentTime->hour;
            $currentMinute = $currentTime->minute;

            $startHour = 7;   // Jam mulai
            $endHour = 15;    // Jam akhir

            if ($currentHour < $startHour || ($currentHour >= $endHour && $currentMinute > 0)) {
                return response()->json([
                    'success' => false,
                    'message' => "Check-in hanya dapat dilakukan antara jam {$startHour}:00 sampai {$endHour}:00"
                ], 400);
            }

            // Cek apakah sudah check-in hari ini
            $todayAttendance = AttendanceRecord::where('user_id', $user->user_id)
                ->whereDate('attendance_date', Carbon::today())
                ->first();

            if ($todayAttendance) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah melakukan check-in hari ini'
                ], 400);
            }

            // Tentukan status berdasarkan jam
            $status = 'Hadir';
            if ($currentHour >= 8) {
                $status = 'Terlambat';
            }

            // Buat record baru
            $attendance = AttendanceRecord::create([
                'user_id' => $user->user_id,
                'full_name' => $user->full_name,
                'attendance_date' => Carbon::today(),
                'check_in_time' => $currentTime->format('H:i:s'),
                'status' => $status,
                'notes' => $request->notes ?? '',
                'gps_location' => $request->gps_location ?? '',
                'created_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Check-in berhasil',
                'data' => $attendance
            ]);

        } catch (\Exception $e) {
            Log::error('Checkin error: ' . $e->getMessage(), [
                'user_id' => Auth::id() ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal check in: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check in via AttendanceService (opsional)
     */
    public function checkInService(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Check placement - if user is from "lapangan", disable attendance
            if ($user->penempatan === 'lapangan') {
                return response()->json([
                    'success' => false,
                    'message' => 'Absen tidak tersedia untuk anak lapangan'
                ], 400);
            }
            
            $attendance = $this->attendanceService->checkIn(
                $user->user_id,
                $request->notes,
                $request->gps_location
            );

            return response()->json([
                'success' => true,
                'message' => 'Check-in berhasil (via service)',
                'data' => $attendance
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage()
            ], 400);
        }
    }

    /**
 * Ambil data absensi user sendiri dengan auto mark absen
 */
public function myAttendance(Request $request)
{
    try {
        $user = $request->user();

        if (!$user || !$user->user_id) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }

        $this->checkAndMarkAbsent($user->user_id);

        $attendances = AttendanceRecord::where('user_id', $user->user_id)
            ->orderBy('attendance_date', 'desc')
            ->limit(7)
            ->get();

        // Pastikan format response konsisten
        return response()->json([
            'success' => true,
            'data' => $attendances->map(function($attendance) {
                return [
                    'attendance_id' => $attendance->attendance_id,
                    'user_id' => $attendance->user_id,
                    'attendance_date' => $attendance->attendance_date,
                    'check_in_time' => $attendance->check_in_time,
                    'status' => $attendance->status,
                    'notes' => $attendance->notes,
                    'gps_location' => $attendance->gps_location,
                    'full_name' => $attendance->full_name,
                    'created_at' => $attendance->created_at,
                    'updated_at' => $attendance->updated_at
                ];
            })
        ]);
    } catch (\Exception $e) {
        Log::error('Attendance error: ' . $e->getMessage(), [
            'user_id' => $request->user()->user_id ?? 'unknown',
            'trace' => $e->getTraceAsString()
        ]);

        return response()->json([
            'success' => false,
            'message' => 'Failed to load attendance data: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Mendapatkan semua data absensi (admin/coordinator)
     */
    public function getAllAttendance(Request $request)
    {
        try {
            $attendance = $this->attendanceService->getAttendanceWithNames();

            return response()->json([
                'success' => true,
                'data' => $attendance
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data absensi'
            ], 500);
        }
    }

    /**
     * Mendapatkan absensi user tertentu (versi tambahan)
     */
    public function getMyAttendance()
    {
        try {
            $user = Auth::user();
            $attendance = $this->attendanceService->getAttendanceWithNames($user->user_id);

            return response()->json([
                'success' => true,
                'data' => $attendance
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data absensi'
            ], 500);
        }
    }

    /**
     * Cek dan tandai absen otomatis jika tidak check-in sebelum jam 10
     */
    private function checkAndMarkAbsent($userId)
    {
        $today = Carbon::today();
        $currentTime = Carbon::now();

        // Check user's placement - skip if user is from "lapangan"
        $user = User::find($userId);
        if (!$user || $user->penempatan === 'lapangan') {
            return; // Skip auto absence for "lapangan" participants
        }

        $todayAttendance = AttendanceRecord::where('user_id', $userId)
            ->whereDate('attendance_date', $today)
            ->first();

        if (!$todayAttendance && $currentTime->hour >= 10) {
            AttendanceRecord::create([
                'user_id' => $userId,
                'full_name' => $user->full_name,
                'attendance_date' => $today,
                'check_in_time' => null,
                'status' => 'Alpa',
                'notes' => 'Absen otomatis - Tidak check-in',
                'gps_location' => '',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }
    }

    /**
     * Statistik kehadiran bulanan
     */
    public function myStatistics(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user || !$user->user_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Check placement - if user is from "lapangan", return empty statistics
            if ($user->penempatan === 'lapangan') {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'percentage' => 0,
                        'present' => 0,
                        'late' => 0,
                        'absent' => 0,
                        'sick' => 0,
                        'permission' => 0,
                        'total' => 0,
                        'month' => Carbon::now()->format('F Y')
                    ]
                ]);
            }

            $this->checkAndMarkAbsent($user->user_id);

            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;

            $attendances = AttendanceRecord::where('user_id', $user->user_id)
                ->whereMonth('attendance_date', $currentMonth)
                ->whereYear('attendance_date', $currentYear)
                ->get();

            $total = $attendances->count();
            $present = $attendances->where('status', 'Hadir')->count();
            $late = $attendances->where('status', 'Terlambat')->count();
            $absent = $attendances->where('status', 'Alpa')->count();
            $sick = $attendances->where('status', 'Sakit')->count();
            $permission = $attendances->where('status', 'Izin')->count();

            $totalPresent = $present + $late;
            $percentage = $total > 0 ? round(($totalPresent / $total) * 100, 2) : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'percentage' => $percentage,
                    'present' => $present,
                    'late' => $late,
                    'absent' => $absent,
                    'sick' => $sick,
                    'permission' => $permission,
                    'total' => $total,
                    'month' => Carbon::create($currentYear, $currentMonth)->format('F Y')
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Attendance statistics error: ' . $e->getMessage(), [
                'user_id' => $request->user()->user_id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load attendance statistics: ' . $e->getMessage()
            ], 500);
        }
    }
}
