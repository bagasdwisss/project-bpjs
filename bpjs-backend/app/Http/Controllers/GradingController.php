<?php

namespace App\Http\Controllers;

use App\Models\Progress;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class GradingController extends Controller
{
    // Konfigurasi grading system
    private $GRADE_RANGES = [
        "A" => [85, 100],
        "B+" => [80, 85],
        "B" => [75, 80],
        "C+" => [70, 75],
        "C" => [65, 70],
        "D" => [50, 65],
        "E" => [0, 50]
    ];

    // Fungsi untuk menentukan grade
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

    // Get all participants for grading
    public function getParticipants(Request $request)
    {
        try {
            $filters = $request->only(['search', 'coordinator_id']);
            
            $query = Progress::with(['user', 'user.coordinator']);

            // Search filter
            if (!empty($filters['search'])) {
                $search = $filters['search'];
                $query->whereHas('user', function($q) use ($search) {
                    $q->where('full_name', 'LIKE', "%{$search}%")
                    ->orWhere('unique_id', 'LIKE', "%{$search}%");
                });
            }

            // Filter by coordinator
            if (!empty($filters['coordinator_id'])) {
                $query->whereHas('user', function($q) use ($filters) {
                    $q->where('coordinator_id', $filters['coordinator_id']);
                });
            }

            $participants = $query->orderBy('updated_at', 'desc')
                ->get()
                ->map(function($progress) {
                    return [
                        'id' => $progress->id,
                        'user_id' => $progress->user_id,
                        'participant_name' => $progress->user->full_name,
                        'participant_id' => $progress->user->unique_id,
                        'coordinator_id' => $progress->user->coordinator_id,
                        'coordinator_name' => $progress->user->coordinator->full_name ?? 'Belum ada koordinator',
                        
                        // Progress components
                        'kunjungan_bpu' => $progress->kunjungan_bpu,
                        'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                        'kunjungan_pu' => $progress->kunjungan_pu,
                        'video_viralisasi' => $progress->video_viralisasi,
                        'kehadiran_seminar' => $progress->kehadiran_seminar,
                        'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                        
                        // Current scores
                        'total_poin' => $progress->total_poin,
                        'nilai' => $progress->nilai,
                        'grade' => $progress->grade,
                        
                        'last_updated' => $progress->updated_at,
                        'created_at' => $progress->created_at
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'participants' => $participants
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getParticipants: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participants: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update participant scores
    public function updateScores(Request $request, $progressId)
    {
        try {
            $request->validate([
                'nilai' => 'required|numeric|min:0|max:100',
                'grade' => 'required|string|in:A,B+,B,C+,C,D,E'
            ]);

            $progress = Progress::findOrFail($progressId);
            
            $progress->update([
                'nilai' => $request->nilai,
                'grade' => $request->grade
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Scores updated successfully',
                'data' => [
                    'participant' => [
                        'id' => $progress->id,
                        'participant_name' => $progress->user->full_name,
                        'total_poin' => $progress->total_poin,
                        'nilai' => $progress->nilai,
                        'grade' => $progress->grade
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in updateScores: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update scores: ' . $e->getMessage()
            ], 500);
        }
    }

    // Update progress components
    public function updateProgress(Request $request, $progressId)
    {
        try {
            $request->validate([
                'kunjungan_bpu' => 'required|integer|min:0',
                'hasil_akuisisi_bpu' => 'required|integer|min:0',
                'kunjungan_pu' => 'required|integer|min:0',
                'video_viralisasi' => 'required|integer|min:0',
                'kehadiran_seminar' => 'required|integer|min:0',
                'kehadiran_sosialisasi' => 'required|integer|min:0'
            ]);

            $progress = Progress::findOrFail($progressId);
            
            // Update components
            $progress->update([
                'kunjungan_bpu' => $request->kunjungan_bpu,
                'hasil_akuisisi_bpu' => $request->hasil_akuisisi_bpu,
                'kunjungan_pu' => $request->kunjungan_pu,
                'video_viralisasi' => $request->video_viralisasi,
                'kehadiran_seminar' => $request->kehadiran_seminar,
                'kehadiran_sosialisasi' => $request->kehadiran_sosialisasi
            ]);

            // Calculate scores based on updated components
            $progress->updateCalculatedFieldsOnly();

            return response()->json([
                'success' => true,
                'message' => 'Progress updated successfully',
                'data' => [
                    'progress' => [
                        'id' => $progress->id,
                        'participant_name' => $progress->user->full_name,
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
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in updateProgress: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update progress: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get participant detail
    public function getParticipantDetail($progressId)
    {
        try {
            $progress = Progress::with(['user', 'user.coordinator'])->findOrFail($progressId);

            $participant = [
                'id' => $progress->id,
                'participant' => [
                    'user_id' => $progress->user->user_id,
                    'full_name' => $progress->user->full_name,
                    'unique_id' => $progress->user->unique_id,
                    'coordinator' => $progress->user->coordinator ? [
                        'name' => $progress->user->coordinator->full_name,
                        'id' => $progress->user->coordinator->user_id
                    ] : null
                ],
                'components' => [
                    'kunjungan_bpu' => $progress->kunjungan_bpu,
                    'hasil_akuisisi_bpu' => $progress->hasil_akuisisi_bpu,
                    'kunjungan_pu' => $progress->kunjungan_pu,
                    'video_viralisasi' => $progress->video_viralisasi,
                    'kehadiran_seminar' => $progress->kehadiran_seminar,
                    'kehadiran_sosialisasi' => $progress->kehadiran_sosialisasi,
                ],
                'scores' => [
                    'total_poin' => $progress->total_poin,
                    'nilai' => $progress->nilai,
                    'grade' => $progress->grade,
                ],
                'timestamps' => [
                    'created_at' => $progress->created_at,
                    'updated_at' => $progress->updated_at
                ]
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'participant' => $participant
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getParticipantDetail: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participant details: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get coordinators for filter
    public function getCoordinators()
    {
        try {
            $coordinators = User::where('role_id', 2) // Role ID 2 for Coordinator
                ->select('user_id', 'full_name', 'unique_id')
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'coordinators' => $coordinators
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error in getCoordinators: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch coordinators: ' . $e->getMessage()
            ], 500);
        }
    }

    // Get grading configuration
    public function getGradingConfiguration()
    {
        return response()->json([
            'success' => true,
            'data' => [
                'grade_ranges' => $this->GRADE_RANGES,
                'max_score' => 100
            ]
        ]);
    }

    /**
     * ✅ GET PARTICIPANTS WITHOUT PROGRESS
     * Mengembalikan peserta yang belum punya entry di table progress
     * HANYA untuk coordinator yang sedang login
     */
    public function getParticipantsWithoutProgress(Request $request)
    {
        try {
            // Get authenticated user
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access'
                ], 401);
            }

            // Validate coordinator role
            if ($user->role_id !== 2) { // role_id 2 = coordinator
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya koordinator yang dapat mengakses fitur ini'
                ], 403);
            }

            Log::info('Fetching participants without progress for coordinator: ' . $user->user_id);

            // Get participants without progress entries more efficiently
            $participantsWithoutProgress = User::where('role_id', 1) // role_id 1 = peserta
                ->where('coordinator_id', $user->user_id)
                ->whereNotExists(function ($query) {
                    $query->select(DB::raw(1))
                        ->from('progress')
                        ->whereColumn('progress.user_id', 'users.user_id');
                })
                ->select('user_id', 'unique_id', 'full_name')
                ->get();

            Log::info('Found ' . $participantsWithoutProgress->count() . ' participants without progress');

            return response()->json([
                'success' => true,
                'data' => [
                    'participants' => $participantsWithoutProgress
                ]
            ]);
            
        } catch (\Exception $error) {
            Log::error('Error in getParticipantsWithoutProgress: ' . $error->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch participants without progress: ' . $error->getMessage()
            ], 500);
        }
    }

    /**
     * ✅ CREATE PROGRESS ENTRY
     * Membuat entry progress baru untuk peserta
     * HANYA untuk coordinator yang sedang login
     */
    public function createProgressEntry(Request $request)
    {
        try {
            // Validate request
            $request->validate([
                'participant_id' => 'required|exists:users,user_id'
            ]);

            // Get authenticated user
            $user = auth()->user();
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized access'
                ], 401);
            }

            // Validate coordinator role
            if ($user->role_id !== 2) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya koordinator yang dapat mengakses fitur ini'
                ], 403);
            }

            $participantId = $request->input('participant_id');
            
            Log::info('Attempting to create progress entry', [
                'coordinator_id' => $user->user_id,
                'participant_id' => $participantId
            ]);

            // Check if participant belongs to this coordinator
            $participant = User::where('user_id', $participantId)
                ->where('coordinator_id', $user->user_id)
                ->where('role_id', 1)
                ->first();

            if (!$participant) {
                return response()->json([
                    'success' => false,
                    'message' => 'Participant not found or not under your coordination'
                ], 404);
            }

            // Check for existing progress entry using firstOrCreate to avoid race conditions
            $progress = Progress::firstOrCreate(
                ['user_id' => $participantId],
                [
                    'kunjungan_bpu' => 0,
                    'hasil_akuisisi_bpu' => 0,
                    'kunjungan_pu' => 0,
                    'video_viralisasi' => 0,
                    'kehadiran_seminar' => 0,
                    'kehadiran_sosialisasi' => 0,
                    'total_poin' => 0,
                    'nilai' => 0,
                    'grade' => 'E', // Default grade (will be updated by calculation)
                ]
            );
            
            // Calculate the initial scores based on the components
            $progress->updateCalculatedFieldsOnly();

            if (!$progress->wasRecentlyCreated) {
                return response()->json([
                    'success' => false,
                    'message' => 'Progress entry already exists for this participant'
                ], 409);
            }

            Log::info('Progress entry created successfully', [
                'progress_id' => $progress->id,
                'participant_id' => $participantId
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Progress entry created successfully',
                'data' => [
                    'progress_id' => $progress->id
                ]
            ]);
            
        } catch (\Exception $error) {
            Log::error('Error in createProgressEntry: ' . $error->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create progress entry: ' . $error->getMessage()
            ], 500);
        }
    }
}