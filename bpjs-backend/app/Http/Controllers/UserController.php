<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Menampilkan daftar semua pengguna.
     * Mendukung filter berdasarkan 'role'.
     * Contoh request: GET /api/users?role=participant
     */
    public function index(Request $request)
    {
        $query = User::query();

        if ($request->has('role') && $request->role != 'all') {
            $query->where('role_id', $request->role);
        }

        if ($request->has('coordinator_id')) {
            $query->where('coordinator_id', $request->coordinator_id);
        }

        $users = $query->with('coordinator')->latest()->get();
        
        // Log untuk debugging
        Log::info('Users loaded', ['count' => $users->count()]);
        
        return $users;
    }

    /**
     * Menyimpan pengguna baru ke database.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
    'unique_id' => 'required|string|max:20|unique:users',
    'full_name' => 'required|string|max:100',
    'role_id' => ['required', Rule::in([1, 2, 3])],
    'coordinator_id' => 'nullable|exists:users,user_id',
    'penempatan' => 'nullable|in:Kantor,Lapangan', // Tambahkan validasi penempatan
    'password' => 'sometimes|string|min:6',
]);

        Log::info('Creating user', [
            'unique_id' => $validatedData['unique_id'],
            'coordinator_id' => $validatedData['coordinator_id'] ?? null
        ]);

        $validatedData['password_hash'] = Hash::make($request->password ?? 'password123');
        $validatedData['status'] = 'Aktif';

        $user = User::create($validatedData);

        // Load relasi coordinator untuk response
        $user->load('coordinator');

        return response()->json($user, 201);
    }

    /**
     * Menampilkan detail satu pengguna.
     */
    public function show(User $user)
    {
        return $user->load('coordinator');
    }

    /**
     * NEW METHOD: Get user by ID (dengan format response yang konsisten)
     * Endpoint: GET /api/users/{id}
     * Digunakan untuk mendapatkan detail user dengan response format JSON yang konsisten
     */
    public function getUserById($id)
    {
        try {
            $user = User::with('coordinator')->find($id);
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak ditemukan'
                ], 404);
            }

            // Get role name
            $roleName = '';
            switch ($user->role_id) {
                case 1:
                    $roleName = 'Peserta';
                    break;
                case 2:
                    $roleName = 'Koordinator';
                    break;
                case 3:
                    $roleName = 'Administrator';
                    break;
                default:
                    $roleName = 'Unknown';
            }

            // Get coordinator name if exists
            $coordinatorName = null;
            if ($user->coordinator) {
                $coordinatorName = $user->coordinator->full_name;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->user_id,
                    'unique_id' => $user->unique_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email ?? null,
                    'role_id' => $user->role_id,
                    'role_name' => $roleName,
                    'coordinator_id' => $user->coordinator_id,
                    'coordinator_name' => $coordinatorName,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting user by ID', ['error' => $e->getMessage(), 'user_id' => $id]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data user: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mengupdate data pengguna yang sudah ada.
     */
    public function update(Request $request, User $user)
    {
        $validatedData = $request->validate([
    'unique_id' => ['required', 'string', 'max:20', Rule::unique('users')->ignore($user->user_id, 'user_id')],
    'full_name' => 'required|string|max:100',
    'role_id' => ['required', Rule::in([1, 2, 3])],
    'coordinator_id' => 'nullable|exists:users,user_id',
    'penempatan' => 'nullable|in:Kantor,Lapangan', // Tambahkan validasi penempatan
    'status' => ['nullable', Rule::in(['Aktif', 'Nonaktif'])],
]);


        Log::info('Updating user', [
            'user_id' => $user->user_id,
            'coordinator_id' => $validatedData['coordinator_id'] ?? null
        ]);

        if ($request->has('password') && $request->password) {
            $validatedData['password_hash'] = Hash::make($request->password);
        }

        $user->update($validatedData);

        return response()->json($user->load('coordinator'));
    }

    /**
     * Menghapus pengguna.
     */
    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(null, 204);
    }

    /**
     * Import users from Excel
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv'
        ]);

        try {
            $file = $request->file('file');
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            $importedCount = 0;
            $errors = [];

            array_shift($rows);

            foreach ($rows as $index => $row) {
                try {
                    $userData = [
                        'unique_id' => $row[0],
                        'full_name' => $row[1],
                        'role_id' => $row[2] ?? 1,
                        'coordinator_id' => $row[3] ?? null,
                        'password_hash' => Hash::make('password123'),
                        'status' => 'Aktif'
                    ];

                    User::create($userData);
                    $importedCount++;
                } catch (\Exception $e) {
                    $errors[] = "Baris " . ($index + 2) . ": " . $e->getMessage();
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Berhasil mengimpor {$importedCount} pengguna",
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengimpor file: ' . $e->getMessage()
            ], 500);
        }
    }

    /* ----------------------------------------------------------------------
     *  Bagian relasi koordinator - peserta
     * --------------------------------------------------------------------*/

    /**
     * Get participants for coordinator
     */
    public function getMyParticipants(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            Log::info('Getting participants for coordinator', ['coordinator_id' => $user->user_id]);

            if ($user->role_id !== 2 && $user->role_name !== 'coordinator') {
                return response()->json(['success' => false, 'message' => 'Access denied. Coordinator role required.'], 403);
            }

            $participants = User::where('coordinator_id', $user->user_id)
                ->where('role_id', 1)
                ->where('status', 'Aktif')
                ->select('user_id', 'unique_id', 'full_name', 'status', 'created_at')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $participants,
                'count' => $participants->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting participants', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to load participants'], 500);
        }
    }

    /**
     * Get participants by coordinator
     */
    public function getParticipantsByCoordinator(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $participants = User::where(function ($query) use ($user) {
                $query->where('coordinator_id', $user->user_id)
                      ->orWhere('assigned_coordinator', $user->user_id);
            })
            ->where('role_id', 1)
            ->where('status', 'Aktif')
            ->select('user_id', 'unique_id', 'full_name', 'status', 'created_at')
            ->get();

            return response()->json([
                'success' => true,
                'data' => $participants,
                'count' => $participants->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting participants by coordinator', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to load participants'], 500);
        }
    }

    /**
     * Get participant detail
     */
    public function getParticipantDetail(Request $request, $id)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            $participant = User::where('user_id', $id)
                ->where(function ($query) use ($user) {
                    $query->where('coordinator_id', $user->user_id)
                          ->orWhere('assigned_coordinator', $user->user_id);
                })
                ->where('role_id', 1)
                ->first();

            if (!$participant) {
                return response()->json(['success' => false, 'message' => 'Participant not found or access denied'], 404);
            }

            return response()->json(['success' => true, 'data' => $participant]);
        } catch (\Exception $e) {
            Log::error('Error getting participant detail', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to load participant details'], 500);
        }
    }

    /**
     * Get coordinator for participant
     */
    public function getCoordinator(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json(['success' => false, 'message' => 'User not authenticated'], 401);
            }

            if ($user->role_id === 1) {
                $coordinator = null;

                if ($user->coordinator_id) {
                    $coordinator = User::where('user_id', $user->coordinator_id)
                        ->where('role_id', 2)
                        ->where('status', 'Aktif')
                        ->select('user_id', 'unique_id', 'full_name')
                        ->first();
                }

                if (!$coordinator) {
                    $coordinator = User::where('role_id', 2)
                        ->where('status', 'Aktif')
                        ->select('user_id', 'unique_id', 'full_name')
                        ->first();
                }

                if ($coordinator) {
                    return response()->json(['success' => true, 'data' => $coordinator]);
                }
            }

            return response()->json(['success' => false, 'message' => 'Coordinator not found'], 404);
        } catch (\Exception $e) {
            Log::error('Error getting coordinator', ['error' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Failed to load coordinator data'], 500);
        }
    }

    /**
     * Get all coordinators
     */
    public function getCoordinators(Request $request)
    {
        try {
            $coordinators = User::where('role_id', 2)
                ->where('status', 'Aktif')
                ->select('user_id', 'unique_id', 'full_name', 'email')
                ->get();

            Log::info('Coordinators loaded', ['count' => $coordinators->count()]);
            
            return response()->json([
                'success' => true, 
                'data' => $coordinators
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting coordinators', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false, 
                'message' => 'Failed to load coordinators'
            ], 500);
        }
    }

    /**
     * NEW METHOD: Get profile user yang sedang login
     * Endpoint: GET /api/profile
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Load coordinator relation
            $user->load('coordinator');

            // Get role name
            $roleName = '';
            switch ($user->role_id) {
                case 1:
                    $roleName = 'Peserta';
                    break;
                case 2:
                    $roleName = 'Koordinator';
                    break;
                case 3:
                    $roleName = 'Administrator';
                    break;
                default:
                    $roleName = 'Unknown';
            }

            // Get coordinator name if exists
            $coordinatorName = null;
            if ($user->coordinator) {
                $coordinatorName = $user->coordinator->full_name;
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'user_id' => $user->user_id,
                    'unique_id' => $user->unique_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email ?? null,
                    'role_id' => $user->role_id,
                    'role_name' => $roleName,
                    'coordinator_id' => $user->coordinator_id,
                    'coordinator_name' => $coordinatorName,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                    'updated_at' => $user->updated_at
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting profile', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * NEW METHOD: Update profile user yang sedang login
     * Endpoint: PUT /api/profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $validatedData = $request->validate([
                'full_name' => 'sometimes|string|max:100',
                'email' => 'sometimes|email|max:255',
                'password' => 'sometimes|string|min:6|confirmed',
            ]);

            // Update full name if provided
            if ($request->has('full_name')) {
                $user->full_name = $validatedData['full_name'];
            }

            // Update email if provided
            if ($request->has('email')) {
                $user->email = $validatedData['email'];
            }

            // Update password if provided
            if ($request->has('password') && $request->password) {
                $user->password_hash = Hash::make($validatedData['password']);
            }

            $user->save();

            return response()->json([
                'success' => true,
                'message' => 'Profile berhasil diupdate',
                'data' => [
                    'user_id' => $user->user_id,
                    'unique_id' => $user->unique_id,
                    'full_name' => $user->full_name,
                    'email' => $user->email ?? null,
                    'role_id' => $user->role_id,
                    'status' => $user->status
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating profile', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengupdate profile: ' . $e->getMessage()
            ], 500);
        }
    }
}