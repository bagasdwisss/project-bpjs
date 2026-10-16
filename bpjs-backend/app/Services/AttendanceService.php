<?php

namespace App\Services;

use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AttendanceService
{
    protected $geolocationService;

    public function __construct(GeolocationService $geolocationService)
    {
        $this->geolocationService = $geolocationService;
    }

    public function checkIn($userId, $notes, $gpsLocation)
    {
        // Dapatkan data user untuk full_name dan penempatan
        $user = User::find($userId);
        if (!$user) {
            throw new \Exception('User tidak ditemukan');
        }

        // Check placement - if user is from "lapangan", disable attendance
        if ($user->penempatan === 'lapangan') {
            throw new \Exception('Absen tidak tersedia untuk anak lapangan');
        }

        $currentTime = now();
        $currentDate = $currentTime->format('Y-m-d');

        // Cek apakah sudah check-in hari ini
        $existingAttendance = AttendanceRecord::where('user_id', $userId)
            ->whereDate('attendance_date', $currentDate)
            ->first();

        if ($existingAttendance) {
            throw new \Exception('Anda sudah melakukan check-in hari ini');
        }

        // Konversi koordinat ke alamat
        $address = $gpsLocation;
        if (strpos($gpsLocation, ',') !== false) {
            list($lat, $lon) = explode(',', $gpsLocation);
            $address = $this->geolocationService->getAddressFromCoordinates(trim($lat), trim($lon));
        }

        // Tentukan status berdasarkan waktu
        $checkInTime = $currentTime->format('H:i:s');
        $status = 'hadir'; // default

        // Jika check-in setelah jam 08:00, status terlambat
        if ($currentTime->format('H:i') > '08:00') {
            $status = 'terlambat';
        }

        // Simpan attendance record dengan full_name
        $attendance = AttendanceRecord::create([
            'user_id' => $userId,
            'attendance_date' => $currentDate,
            'check_in_time' => $checkInTime,
            'status' => $status,
            'notes' => $notes,
            'gps_location' => $address,
            'full_name' => $user->full_name // Pastikan full_name selalu diisi
        ]);

        return $attendance;
    }

    // Method untuk menangani absen otomatis
    public function processAutoAbsence()
    {
        $currentDate = now()->format('Y-m-d');
        $currentTime = now()->format('H:i:s');

        // Cari semua user yang aktif
        $activeUsers = User::where('status', 'active')->get();

        foreach ($activeUsers as $user) {
            // Check placement - skip if user is from "lapangan"
            if ($user->penempatan === 'lapangan') {
                continue; // Skip auto absence for "lapangan" participants
            }

            // Cek apakah user sudah absen hari ini
            $existingAttendance = AttendanceRecord::where('user_id', $user->user_id)
                ->whereDate('attendance_date', $currentDate)
                ->first();

            if (!$existingAttendance) {
                // Jika belum absen dan sudah lewat jam 10:00, beri status alpa
                if ($currentTime >= '10:00:00') {
                    AttendanceRecord::create([
                        'user_id' => $user->user_id,
                        'attendance_date' => $currentDate,
                        'check_in_time' => null,
                        'status' => 'alpa',
                        'notes' => 'Absen otomatis - Tidak check-in',
                        'gps_location' => null,
                        'full_name' => $user->full_name // Jangan lupa full_name
                    ]);
                }
            }
        }
    }

    // Method untuk mendapatkan attendance dengan full_name yang konsisten
    public function getAttendanceWithNames($userId = null)
    {
        // If userId is provided, check if user is from "lapangan"
        if ($userId) {
            $user = User::find($userId);
            if ($user && $user->penempatan === 'lapangan') {
                return collect([]); // Return empty collection for "lapangan" users
            }
        }

        $query = AttendanceRecord::with(['user' => function($query) {
            $query->select('user_id', 'full_name');
        }]);

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->orderBy('attendance_date', 'desc')->get();
    }
}