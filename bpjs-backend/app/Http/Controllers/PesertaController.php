<?php

namespace App\Http\Controllers;

use App\Models\Peserta;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PesertaController extends Controller
{
    /**
     * Menampilkan daftar semua peserta.
     * Mendukung filter berdasarkan 'status_pendaftaran'.
     * Contoh request: GET /api/peserta?status_pendaftaran=BARU DAFTAR
     */
    public function index(Request $request)
    {
        $query = Peserta::query();

        if ($request->has('status_pendaftaran') && $request->status_pendaftaran != 'all') {
            $query->where('status_pendaftaran', $request->status_pendaftaran);
        }

        if ($request->has('periode_pelatihan') && $request->periode_pelatihan != 'all') {
            $query->where('periode_pelatihan', $request->periode_pelatihan);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        $peserta = $query->with('user')->latest()->get();

        // Log untuk debugging
        Log::info('Peserta loaded', ['count' => $peserta->count()]);

        return response()->json([
            'success' => true,
            'data' => $peserta,
            'count' => $peserta->count()
        ]);
    }

    /**
     * Menampilkan detail satu peserta.
     */
    public function show($id)
    {
        $peserta = Peserta::with('user')->find($id);

        if (!$peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $peserta
        ]);
    }

    /**
     * Menyimpan peserta baru ke database.
     */
    public function store(Request $request)
    {
        // Validasi dasar
        $validatedData = $request->validate([
            'user_id' => 'required|integer|exists:users,user_id',
            'nama_peserta' => 'required|string|max:100',
            'nik' => 'required|string|max:20|unique:peserta,nik',
            'tanggal_pendaftaran' => 'required|date',
            'no_telepon' => 'nullable|string|max:15',
            'pekerjaan' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:100',
            'status_pendaftaran' => ['nullable', Rule::in(['BARU DAFTAR', 'MENUNGGU PEMBAYARAN', 'PEMBAYARAN BERHASIL'])],
            'periode_pelatihan' => ['nullable', Rule::in(['1bulan', '2bulan', '3bulan', '4bulan', '5bulan', '6bulan', '7bulan', '8bulan', '9bulan', '10bulan', '11bulan', '12bulan'])],
            'biaya' => 'nullable|numeric',
            'bukti_pembayaran' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // max 5MB
            'bukti_sosialisasi' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120', // max 5MB
            'program_terdaftar' => 'nullable|string|max:255',
        ]);

        // Set nilai default
        $dataToSave = [
            'user_id' => $validatedData['user_id'],
            'nama_peserta' => $validatedData['nama_peserta'],
            'nik' => $validatedData['nik'],
            'tanggal_pendaftaran' => $validatedData['tanggal_pendaftaran'],
            'no_telepon' => $validatedData['no_telepon'] ?? null,
            'pekerjaan' => $validatedData['pekerjaan'] ?? null,
            'email' => $validatedData['email'] ?? null,
            'status_pendaftaran' => $validatedData['status_pendaftaran'] ?? 'BARU DAFTAR',
            'periode_pelatihan' => $validatedData['periode_pelatihan'] ?? '1bulan',
            'biaya' => $validatedData['biaya'] ?? 0.00,
            'program_terdaftar' => $validatedData['program_terdaftar'] ?? null,
        ];

        // Handle file uploads
        if ($request->hasFile('bukti_pembayaran')) {
            $file = $request->file('bukti_pembayaran');
            $filename = 'bukti_pembayaran_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('bukti_pembayaran', $filename, 'public');
            $dataToSave['bukti_pembayaran_link'] = $path;
        }

        if ($request->hasFile('bukti_sosialisasi')) {
            $file = $request->file('bukti_sosialisasi');
            $filename = 'bukti_sosialisasi_' . time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('bukti_sosialisasi', $filename, 'public');
            $dataToSave['bukti_sosialisasi_link'] = $path;
        }

        Log::info('Creating peserta', [
            'nik' => $dataToSave['nik'],
            'user_id' => $dataToSave['user_id']
        ]);

        try {
            $peserta = Peserta::create($dataToSave);
            
            // Load relasi user untuk response
            $peserta->load('user');

            return response()->json([
                'success' => true,
                'data' => $peserta
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating peserta', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan data peserta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mengupdate data peserta yang sudah ada.
     */
    public function update(Request $request, $id)
    {
        $peserta = Peserta::find($id);

        if (!$peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta tidak ditemukan'
            ], 404);
        }

        // Validasi
        $validatedData = $request->validate([
            'user_id' => 'sometimes|integer|exists:users,user_id',
            'nama_peserta' => 'sometimes|required|string|max:100',
            'nik' => ['required', 'string', 'max:20', Rule::unique('peserta')->ignore($peserta->peserta_id, 'peserta_id')],
            'tanggal_pendaftaran' => 'sometimes|date',
            'no_telepon' => 'nullable|string|max:15',
            'pekerjaan' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:100',
            'status_pendaftaran' => ['nullable', Rule::in(['BARU DAFTAR', 'MENUNGGU PEMBAYARAN', 'PEMBAYARAN BERHASIL'])],
            'periode_pelatihan' => ['nullable', Rule::in(['1bulan', '2bulan', '3bulan', '4bulan', '5bulan', '6bulan', '7bulan', '8bulan', '9bulan', '10bulan', '11bulan', '12bulan'])],
            'biaya' => 'nullable|numeric',
            'bukti_pembayaran' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'bukti_sosialisasi' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'program_terdaftar' => 'nullable|string|max:255',
        ]);

        // Update data
        $peserta->user_id = $validatedData['user_id'] ?? $peserta->user_id;
        $peserta->nama_peserta = $validatedData['nama_peserta'] ?? $peserta->nama_peserta;
        $peserta->nik = $validatedData['nik'] ?? $peserta->nik;
        $peserta->tanggal_pendaftaran = $validatedData['tanggal_pendaftaran'] ?? $peserta->tanggal_pendaftaran;
        $peserta->no_telepon = $validatedData['no_telepon'] ?? $peserta->no_telepon;
        $peserta->pekerjaan = $validatedData['pekerjaan'] ?? $peserta->pekerjaan;
        $peserta->email = $validatedData['email'] ?? $peserta->email;
        $peserta->status_pendaftaran = $validatedData['status_pendaftaran'] ?? $peserta->status_pendaftaran;
        $peserta->periode_pelatihan = $validatedData['periode_pelatihan'] ?? $peserta->periode_pelatihan;
        $peserta->biaya = $validatedData['biaya'] ?? $peserta->biaya;
        $peserta->program_terdaftar = $validatedData['program_terdaftar'] ?? $peserta->program_terdaftar;

        // Handle file uploads
        if ($request->hasFile('bukti_pembayaran')) {
            // Delete old file if exists
            if ($peserta->bukti_pembayaran_link) {
                Storage::disk('public')->delete($peserta->bukti_pembayaran_link);
            }

            $file = $request->file('bukti_pembayaran');
            $filename = 'bukti_pembayaran_' . $peserta->peserta_id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('bukti_pembayaran', $filename, 'public');
            $peserta->bukti_pembayaran_link = $path;
        }

        if ($request->hasFile('bukti_sosialisasi')) {
            // Delete old file if exists
            if ($peserta->bukti_sosialisasi_link) {
                Storage::disk('public')->delete($peserta->bukti_sosialisasi_link);
            }

            $file = $request->file('bukti_sosialisasi');
            $filename = 'bukti_sosialisasi_' . $peserta->peserta_id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('bukti_sosialisasi', $filename, 'public');
            $peserta->bukti_sosialisasi_link = $path;
        }

        Log::info('Updating peserta', [
            'peserta_id' => $peserta->peserta_id,
            'nik' => $peserta->nik
        ]);

        try {
            $peserta->save();
            
            // Load relasi user untuk response
            $peserta->load('user');

            return response()->json([
                'success' => true,
                'data' => $peserta
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating peserta', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate data peserta: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Menghapus peserta.
     */
    public function destroy($id)
    {
        $peserta = Peserta::find($id);

        if (!$peserta) {
            return response()->json([
                'success' => false,
                'message' => 'Peserta tidak ditemukan'
            ], 404);
        }

        // Hapus file jika ada
        if ($peserta->bukti_pembayaran_link) {
            Storage::disk('public')->delete($peserta->bukti_pembayaran_link);
        }
        
        if ($peserta->bukti_sosialisasi_link) {
            Storage::disk('public')->delete($peserta->bukti_sosialisasi_link);
        }

        $peserta->delete();

        return response()->json([
            'success' => true,
            'message' => 'Peserta berhasil dihapus'
        ], 200);
    }

    /**
     * Get all acquisition results for participant
     * Endpoint: GET /api/peserta/acquisition-results
     */
    public function getAcquisitionResults(Request $request)
    {
        try {
            // Jika user adalah peserta, hanya tampilkan data peserta tersebut
            $user = $request->user();
            $query = Peserta::query();

            if ($user && $user->role_id == 1) { // Role peserta
                $query->where('user_id', $user->user_id);
            }

            // Tambahkan filter jika disediakan
            if ($request->has('status_pendaftaran') && $request->status_pendaftaran) {
                $query->where('status_pendaftaran', $request->status_pendaftaran);
            }

            if ($request->has('periode_pelatihan') && $request->periode_pelatihan) {
                $query->where('periode_pelatihan', $request->periode_pelatihan);
            }

            $acquisitionResults = $query->with('user')
                ->orderBy('tanggal_pendaftaran', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $acquisitionResults,
                'count' => $acquisitionResults->count()
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting acquisition results', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengambil data hasil akuisisi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload bukti pembayaran untuk peserta
     * Endpoint: POST /api/peserta/{id}/upload-payment-proof
     */
    public function uploadPaymentProof(Request $request, $id)
    {
        try {
            $user = $request->user();
            $peserta = Peserta::find($id);

            if (!$peserta) {
                return response()->json([
                    'success' => false,
                    'message' => 'Peserta tidak ditemukan'
                ], 404);
            }

            // Validasi bahwa peserta milik user yang sedang login
            if ($user->user_id != $peserta->user_id && $user->role_id != 2 && $user->role_id != 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $request->validate([
                'bukti_pembayaran' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120'
            ]);

            if ($request->hasFile('bukti_pembayaran')) {
                // Delete old file if exists
                if ($peserta->bukti_pembayaran_link) {
                    Storage::disk('public')->delete($peserta->bukti_pembayaran_link);
                }

                $file = $request->file('bukti_pembayaran');
                $filename = 'bukti_pembayaran_' . $peserta->peserta_id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('bukti_pembayaran', $filename, 'public');

                $peserta->bukti_pembayaran_link = $path;
                $peserta->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Bukti pembayaran berhasil diunggah',
                    'data' => [
                        'bukti_pembayaran_link' => $path
                    ]
                ], 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'File bukti pembayaran tidak ditemukan'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Error uploading payment proof', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengunggah bukti pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload bukti sosialisasi untuk peserta
     * Endpoint: POST /api/peserta/{id}/upload-socialization-proof
     */
    public function uploadSocializationProof(Request $request, $id)
    {
        try {
            $user = $request->user();
            $peserta = Peserta::find($id);

            if (!$peserta) {
                return response()->json([
                    'success' => false,
                    'message' => 'Peserta tidak ditemukan'
                ], 404);
            }

            // Validasi bahwa peserta milik user yang sedang login
            if ($user->user_id != $peserta->user_id && $user->role_id != 2 && $user->role_id != 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $request->validate([
                'bukti_sosialisasi' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120'
            ]);

            if ($request->hasFile('bukti_sosialisasi')) {
                // Delete old file if exists
                if ($peserta->bukti_sosialisasi_link) {
                    Storage::disk('public')->delete($peserta->bukti_sosialisasi_link);
                }

                $file = $request->file('bukti_sosialisasi');
                $filename = 'bukti_sosialisasi_' . $peserta->peserta_id . '_' . time() . '.' . $file->getClientOriginalExtension();
                $path = $file->storeAs('bukti_sosialisasi', $filename, 'public');

                $peserta->bukti_sosialisasi_link = $path;
                $peserta->save();

                return response()->json([
                    'success' => true,
                    'message' => 'Bukti sosialisasi berhasil diunggah',
                    'data' => [
                        'bukti_sosialisasi_link' => $path
                    ]
                ], 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'File bukti sosialisasi tidak ditemukan'
            ], 400);

        } catch (\Exception $e) {
            Log::error('Error uploading socialization proof', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengunggah bukti sosialisasi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update status pendaftaran setelah pembayaran berhasil
     * Endpoint: PUT /api/peserta/{id}/confirm-payment
     */
    public function confirmPayment(Request $request, $id)
    {
        try {
            $user = $request->user();
            $peserta = Peserta::find($id);

            if (!$peserta) {
                return response()->json([
                    'success' => false,
                    'message' => 'Peserta tidak ditemukan'
                ], 404);
            }

            // Validasi bahwa peserta milik user yang sedang login
            if ($user->user_id != $peserta->user_id && $user->role_id != 2 && $user->role_id != 3) {
                return response()->json([
                    'success' => false,
                    'message' => 'Akses ditolak'
                ], 403);
            }

            $peserta->status_pendaftaran = 'PEMBAYARAN BERHASIL';
            $peserta->save();

            return response()->json([
                'success' => true,
                'message' => 'Pembayaran berhasil dikonfirmasi',
                'data' => $peserta
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error confirming payment', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengkonfirmasi pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }
}