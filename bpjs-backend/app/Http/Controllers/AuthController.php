<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user
     */
    public function login(Request $request)
    {
        try {
            // Validasi input
            $credentials = $request->validate([
                'unique_id' => 'required|string',
                'password' => 'required|string'
            ]);

            Log::info('Login attempt', ['unique_id' => $request->unique_id]);

            // Find user
            $user = User::where('unique_id', $request->unique_id)->first();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            // Check if user is active
            if (strtolower($user->status) !== 'aktif') {
                return response()->json([
                    'success' => false,
                    'message' => 'Account is inactive'
                ], 403);
            }

            // Verify password - coba kedua field kemungkinan
            $passwordValid = false;
            if (Hash::check($request->password, $user->password)) {
                $passwordValid = true;
            } else if (isset($user->password_hash) && Hash::check($request->password, $user->password_hash)) {
                $passwordValid = true;
            }

            if (!$passwordValid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid credentials'
                ], 401);
            }

            // Load role relationship dengan error handling
            $roleName = null;
            try {
                if ($user->relationLoaded('role') && $user->role) {
                    $roleName = $user->role->role_name;
                } else if ($user->role_id) {
                    // Load role manually
                    $role = Role::find($user->role_id);
                    $roleName = $role ? $role->role_name : null;
                }
            } catch (\Exception $e) {
                Log::warning('Failed to load role relationship: ' . $e->getMessage());
                $roleName = $this->getRoleNameById($user->role_id);
            }

            // Create token
            $token = $user->createToken('auth_token')->plainTextToken;

            // Log successful login
            $this->logActivity($user->user_id, 'Login', 'User logged in successfully', $request->ip());

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'user_id' => $user->user_id,
                        'unique_id' => $user->unique_id,
                        'full_name' => $user->full_name,
                        'role' => $roleName,
                        'role_id' => $user->role_id,
                        'status' => $user->status,
                        'penempatan' => $user->penempatan,
                    ]
                ]
            ]);

        } catch (ValidationException $e) {
            Log::error('Validation error', ['errors' => $e->errors()]);
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $e->errors()
            ], 422);
            
        } catch (\Exception $e) {
            Log::error('Login error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Login failed. Please try again.',
                'error' => env('APP_DEBUG') ? $e->getMessage() : 'Internal server error'
            ], 500);
        }
    }

    /**
     * Get role name by ID (fallback method)
     */
    private function getRoleNameById($roleId)
    {
        $roles = [
            1 => 'Peserta',
            2 => 'Koordinator', 
            3 => 'Administrator'
        ];
        
        return $roles[$roleId] ?? 'Unknown';
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }
        
        // Load role dengan error handling
        $roleName = null;
        try {
            if ($user->relationLoaded('role') && $user->role) {
                $roleName = $user->role->role_name;
            } else if ($user->role_id) {
                $role = Role::find($user->role_id);
                $roleName = $role ? $role->role_name : null;
            }
        } catch (\Exception $e) {
            Log::warning('Failed to load role in me() method: ' . $e->getMessage());
            $roleName = $this->getRoleNameById($user->role_id);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user_id' => $user->user_id,
                'unique_id' => $user->unique_id,
                'full_name' => $user->full_name,
                'role' => $roleName,
                'role_id' => $user->role_id,
                'status' => $user->status,
                'penempatan' => $user->penempatan,
            ]
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not authenticated'
            ], 401);
        }
        
        // Log activity
        $this->logActivity($user->user_id, 'Logout', 'User logged out', $request->ip());
        
        // Revoke current token
        try {
            $request->user()->currentAccessToken()->delete();
        } catch (\Exception $e) {
            Log::warning('Failed to delete token: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil'
        ]);
    }

    public function changePassword(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'current_password' => 'required',
                'new_password' => 'required|min:6|confirmed',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validasi gagal',
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();

            // Check current password
            if (!Hash::check($request->current_password, $user->password_hash)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Password saat ini salah'
                ], 422);
            }

            // Update password
            $user->password_hash = Hash::make($request->new_password);
            $user->save();

           

            return response()->json([
                'success' => true,
                'message' => 'Password berhasil diubah'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Log user activity
     */
    private function logActivity($userId, $activityType, $details, $ipAddress)
    {
        try {
            // Pastikan model ActivityLog ada
            if (class_exists(\App\Models\ActivityLog::class)) {
                \App\Models\ActivityLog::create([
                    'user_id' => $userId,
                    'activity_type' => $activityType,
                    'details' => $details,
                    'ip_address' => $ipAddress,
                ]);
            }
        } catch (\Exception $e) {
            Log::warning('Failed to log activity: ' . $e->getMessage());
        }
    }
}