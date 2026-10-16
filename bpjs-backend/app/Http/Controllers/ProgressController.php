<?php

namespace App\Http\Controllers;

use App\Models\Progress;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class ProgressController extends Controller
{
    /**
     * Get progress untuk peserta yang sedang login
     * Endpoint: GET /api/participant/progress
     */
    public function myProgress(Request $request)
    {
        try {
            $user = Auth::user();
            
            // Ambil progress dengan relasi coordinator
            $progress = Progress::where('user_id', $user->user_id)->first();
            
            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data progress tidak ditemukan'
                ], 404);
            }

            // Get coordinator name
            $coordinatorName = '-';
            if ($user->coordinator_id) {
                $coordinator = User::find($user->coordinator_id);
                if ($coordinator) {
                    $coordinatorName = $coordinator->full_name;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'full_name' => $user->full_name,
                    'unique_id' => $user->unique_id,
                    'email' => $user->email ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-'
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all progress (untuk Admin/Koordinator)
     * Endpoint: GET /api/coordinator/progress atau GET /api/admin/progress
     */
    public function index(Request $request)
    {
        try {
            $user = Auth::user();
            $query = Progress::with('user.coordinator');

            // Jika koordinator, hanya tampilkan progress participant mereka
            if ($user->role_id == 2) { // Koordinator
                $query->whereHas('user', function($q) use ($user) {
                    $q->where('coordinator_id', $user->user_id);
                });
            }

            $progressList = $query->orderBy('created_at', 'desc')->get();

            $data = $progressList->map(function($progress) {
                $coordinatorName = '-';
                if ($progress->user && $progress->user->coordinator) {
                    $coordinatorName = $progress->user->coordinator->full_name;
                }

                return [
                    'id' => $progress->id,
                    'user_id' => $progress->user_id,
                    'full_name' => $progress->user->full_name ?? '-',
                    'unique_id' => $progress->user->unique_id ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-',
                    'updated_at' => $progress->updated_at
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get progress by user_id
     * Endpoint: GET /api/coordinator/participants/{id}/progress
     */
    public function show($userId)
    {
        try {
            $user = User::find($userId);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak ditemukan'
                ], 404);
            }

            $progress = Progress::where('user_id', $userId)->first();
            
            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data progress tidak ditemukan'
                ], 404);
            }

            // Get coordinator name
            $coordinatorName = '-';
            if ($user->coordinator_id) {
                $coordinator = User::find($user->coordinator_id);
                if ($coordinator) {
                    $coordinatorName = $coordinator->full_name;
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $progress->id,
                    'full_name' => $user->full_name,
                    'unique_id' => $user->unique_id,
                    'email' => $user->email ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-',
                    'updated_at' => $progress->updated_at
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get progress by progress ID
     * Endpoint: GET /api/admin/progress/{id}
     */
    public function showById($id)
    {
        try {
            $progress = Progress::with('user.coordinator')->find($id);
            
            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Data progress tidak ditemukan'
                ], 404);
            }

            $coordinatorName = '-';
            if ($progress->user && $progress->user->coordinator) {
                $coordinatorName = $progress->user->coordinator->full_name;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $progress->id,
                    'user_id' => $progress->user_id,
                    'full_name' => $progress->user->full_name ?? '-',
                    'unique_id' => $progress->user->unique_id ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-',
                    'updated_at' => $progress->updated_at
                ]
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NEW METHOD: Get progress data for a specific user (untuk Dashboard)
     * Endpoint: GET /api/users/{userId}/progress
     */
    public function getUserProgress($userId)
    {
        try {
            // Get progress data from database
            $progress = Progress::where('user_id', $userId)->first();

            if (!$progress) {
                // Return default data if not found
                return response()->json([
                    'success' => true,
                    'data' => [
                        'user_id' => $userId,
                        'kunjungan_bpu' => 0,
                        'hasil_akuisisi_bpu' => 0,
                        'kunjungan_pu' => 0,
                        'video_viralisasi' => 0,
                        'kehadiran_seminar' => 0,
                        'kehadiran_sosialisasi' => 0,
                        'total_poin' => 0,
                        'nilai' => 0,
                        'grade' => '-'
                    ]
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $progress->user_id,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving progress data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NEW METHOD: Update progress data for a specific user (untuk Dashboard)
     * Endpoint: PUT /api/users/{userId}/progress
     */
    public function updateUserProgress(Request $request, $userId)
    {
        try {
            // Validate request
            $validator = Validator::make($request->all(), [
                'kunjungan_bpu' => 'nullable|integer|min:0',
                'hasil_akuisisi_bpu' => 'nullable|integer|min:0',
                'kunjungan_pu' => 'nullable|integer|min:0',
                'video_viralisasi' => 'nullable|integer|min:0',
                'kehadiran_seminar' => 'nullable|integer|min:0',
                'kehadiran_sosialisasi' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if progress exists
            $progress = Progress::where('user_id', $userId)->first();

            if ($progress) {
                // Update existing progress
                if ($request->has('kunjungan_bpu')) {
                    $progress->kunjungan_bpu = $request->kunjungan_bpu;
                }
                if ($request->has('hasil_akuisisi_bpu')) {
                    $progress->hasil_akuisisi_bpu = $request->hasil_akuisisi_bpu;
                }
                if ($request->has('kunjungan_pu')) {
                    $progress->kunjungan_pu = $request->kunjungan_pu;
                }
                if ($request->has('video_viralisasi')) {
                    $progress->video_viralisasi = $request->video_viralisasi;
                }
                if ($request->has('kehadiran_seminar')) {
                    $progress->kehadiran_seminar = $request->kehadiran_seminar;
                }
                if ($request->has('kehadiran_sosialisasi')) {
                    $progress->kehadiran_sosialisasi = $request->kehadiran_sosialisasi;
                }

                // Recalculate
                $progress->updateCalculatedFields();
                $progress->save();
            } else {
                // Create new progress record
                $progress = new Progress();
                $progress->user_id = $userId;
                $progress->kunjungan_bpu = $request->kunjungan_bpu ?? 0;
                $progress->hasil_akuisisi_bpu = $request->hasil_akuisisi_bpu ?? 0;
                $progress->kunjungan_pu = $request->kunjungan_pu ?? 0;
                $progress->video_viralisasi = $request->video_viralisasi ?? 0;
                $progress->kehadiran_seminar = $request->kehadiran_seminar ?? 0;
                $progress->kehadiran_sosialisasi = $request->kehadiran_sosialisasi ?? 0;
                
                // Calculate
                $progress->updateCalculatedFields();
                $progress->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Progress updated successfully',
                'data' => [
                    'user_id' => $userId,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error updating progress: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NEW METHOD: Get all progress data for coordinator's participants
     * Endpoint: GET /api/coordinator/participants/progress
     */
    /**
 * Get all progress data for coordinator's participants
 * Endpoint: GET /api/coordinator/participants/progress
 */
public function getCoordinatorParticipantsProgress()
{
    try {
        $user = Auth::user();

        // Get all participants under this coordinator
        $participants = User::where('coordinator_id', $user->user_id)
            ->where('role_id', 1) // Role peserta
            ->get();

        $progressData = [];

        foreach ($participants as $participant) {
            $progress = Progress::where('user_id', $participant->user_id)->first();

            if ($progress) {
                $progressData[] = [
                    'user_id' => $participant->user_id,
                    'unique_id' => $participant->unique_id,
                    'full_name' => $participant->full_name,
                    'email' => $participant->email ?? '-',
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-',
                    'created_at' => $participant->created_at,
                    'status' => $participant->status
                ];
            } else {
                // Default data if no progress found
                $progressData[] = [
                    'user_id' => $participant->user_id,
                    'unique_id' => $participant->unique_id,
                    'full_name' => $participant->full_name,
                    'email' => $participant->email ?? '-',
                    'kunjungan_bpu' => 0,
                    'hasil_akuisisi_bpu' => 0,
                    'kunjungan_pu' => 0,
                    'video_viralisasi' => 0,
                    'kehadiran_seminar' => 0,
                    'kehadiran_sosialisasi' => 0,
                    'total_poin' => 0,
                    'nilai' => 0,
                    'grade' => '-',
                    'created_at' => $participant->created_at,
                    'status' => $participant->status
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $progressData
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error retrieving progress data: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Create new progress
     * Endpoint: POST /api/coordinator/progress atau POST /api/admin/progress
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'user_id' => 'required|exists:users,user_id',
                'kunjungan_bpu' => 'nullable|integer|min:0',
                'hasil_akuisisi_bpu' => 'nullable|integer|min:0',
                'kunjungan_pu' => 'nullable|integer|min:0',
                'video_viralisasi' => 'nullable|integer|min:0',
                'kehadiran_seminar' => 'nullable|integer|min:0',
                'kehadiran_sosialisasi' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Check if progress already exists
            $existingProgress = Progress::where('user_id', $request->user_id)->first();
            if ($existingProgress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Progress untuk user ini sudah ada'
                ], 409);
            }

            $progress = new Progress();
            $progress->user_id = $request->user_id;
            $progress->kunjungan_bpu = $request->kunjungan_bpu ?? 0;
            $progress->hasil_akuisisi_bpu = $request->hasil_akuisisi_bpu ?? 0;
            $progress->kunjungan_pu = $request->kunjungan_pu ?? 0;
            $progress->video_viralisasi = $request->video_viralisasi ?? 0;
            $progress->kehadiran_seminar = $request->kehadiran_seminar ?? 0;
            $progress->kehadiran_sosialisasi = $request->kehadiran_sosialisasi ?? 0;
            
            // Calculate total_poin, nilai, and grade
            $progress->updateCalculatedFields();
            
            $progress->save();

            return response()->json([
                'success' => true,
                'message' => 'Progress berhasil dibuat',
                'data' => $progress
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update progress
     * Endpoint: PUT /api/coordinator/progress/{id} atau PUT /api/admin/progress/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $progress = Progress::find($id);
            
            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Progress tidak ditemukan'
                ], 404);
            }

            $validator = Validator::make($request->all(), [
                'kunjungan_bpu' => 'nullable|integer|min:0',
                'hasil_akuisisi_bpu' => 'nullable|integer|min:0',
                'kunjungan_pu' => 'nullable|integer|min:0',
                'video_viralisasi' => 'nullable|integer|min:0',
                'kehadiran_seminar' => 'nullable|integer|min:0',
                'kehadiran_sosialisasi' => 'nullable|integer|min:0',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            // Update fields
            if ($request->has('kunjungan_bpu')) {
                $progress->kunjungan_bpu = $request->kunjungan_bpu;
            }
            if ($request->has('hasil_akuisisi_bpu')) {
                $progress->hasil_akuisisi_bpu = $request->hasil_akuisisi_bpu;
            }
            if ($request->has('kunjungan_pu')) {
                $progress->kunjungan_pu = $request->kunjungan_pu;
            }
            if ($request->has('video_viralisasi')) {
                $progress->video_viralisasi = $request->video_viralisasi;
            }
            if ($request->has('kehadiran_seminar')) {
                $progress->kehadiran_seminar = $request->kehadiran_seminar;
            }
            if ($request->has('kehadiran_sosialisasi')) {
                $progress->kehadiran_sosialisasi = $request->kehadiran_sosialisasi;
            }

            // Recalculate total_poin, nilai, and grade
            $progress->updateCalculatedFields();
            
            $progress->save();

            return response()->json([
                'success' => true,
                'message' => 'Progress berhasil diupdate',
                'data' => $progress
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
 * NEW METHOD: Get progress data for coordinator's participants with details
 * Endpoint: GET /api/coordinator/participants/progress-details
 */
public function getCoordinatorParticipantsProgressDetails()
{
    try {
        $user = Auth::user();

        // Get all participants under this coordinator
        $participants = User::where('coordinator_id', $user->user_id)
            ->where('role_id', 1) // Role peserta
            ->get();

        $progressData = [];

        foreach ($participants as $participant) {
            $progress = Progress::where('user_id', $participant->user_id)->first();

            // Get coordinator name
            $coordinatorName = '-';
            if ($participant->coordinator_id) {
                $coordinator = User::find($participant->coordinator_id);
                if ($coordinator) {
                    $coordinatorName = $coordinator->full_name;
                }
            }

            if ($progress) {
                $progressData[] = [
                    'user_id' => $participant->user_id,
                    'unique_id' => $participant->unique_id,
                    'full_name' => $participant->full_name,
                    'email' => $participant->email ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade ?? '-',
                    'updated_at' => $progress->updated_at
                ];
            } else {
                // Default data if no progress found
                $progressData[] = [
                    'user_id' => $participant->user_id,
                    'unique_id' => $participant->unique_id,
                    'full_name' => $participant->full_name,
                    'email' => $participant->email ?? '-',
                    'coordinator_name' => $coordinatorName,
                    'kunjungan_bpu' => 0,
                    'hasil_akuisisi_bpu' => 0,
                    'kunjungan_pu' => 0,
                    'video_viralisasi' => 0,
                    'kehadiran_seminar' => 0,
                    'kehadiran_sosialisasi' => 0,
                    'total_poin' => 0,
                    'nilai' => 0,
                    'grade' => '-',
                    'updated_at' => null
                ];
            }
        }

        return response()->json([
            'success' => true,
            'data' => $progressData
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Error retrieving progress data: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Delete progress
     * Endpoint: DELETE /api/coordinator/progress/{id} atau DELETE /api/admin/progress/{id}
     */
    public function destroy($id)
    {
        try {
            $progress = Progress::find($id);
            
            if (!$progress) {
                return response()->json([
                    'success' => false,
                    'message' => 'Progress tidak ditemukan'
                ], 404);
            }

            $progress->delete();

            return response()->json([
                'success' => true,
                'message' => 'Progress berhasil dihapus'
            ], 200);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }
}