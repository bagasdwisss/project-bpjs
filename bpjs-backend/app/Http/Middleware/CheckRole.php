<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  ...$roles
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        $user = $request->user();

        // 1. Cek apakah user sudah login
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.'
            ], 401);
        }

        // 2. Pastikan relasi "role" dimuat dan ambil nama role-nya
        $user->loadMissing('role');
        $userRole = $user->role->role_name ?? null;

        // 3. Jika user tidak memiliki role, tolak akses
        if (!$userRole) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Role pengguna tidak terdefinisi.'
            ], 403);
        }

        // 4. Cek apakah role user cocok dengan salah satu role yang diizinkan
        $isAllowed = false;
        foreach ($roles as $allowedRole) {
            if (strcasecmp($allowedRole, $userRole) === 0) { // case-insensitive
                $isAllowed = true;
                break;
            }
        }

        // 5. Jika tidak cocok, tolak akses dengan pesan informatif
        if (!$isAllowed) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden. Anda tidak memiliki akses untuk resource ini. ' .
                             'Peran Anda: ' . $userRole . 
                             ', Peran yang diizinkan: ' . implode(', ', $roles)
            ], 403);
        }

        // 6. Jika semua pengecekan lolos, lanjutkan request
        return $next($request);
    }
}
