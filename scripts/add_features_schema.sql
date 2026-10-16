-- ========================================================
-- FEATURE EXPANSION SCHEMA FOR BPJS KETENAGAKERJAAN
-- ========================================================

-- 1. GEOFENCE LOCATIONS (Multi-titik Kantor & Lapangan)
CREATE TABLE IF NOT EXISTS geofence_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'kantor', -- 'kantor', 'lapangan_pasar', 'lapangan_umkm', 'lapangan_industri'
    address TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INT DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Geofence Locations if empty
INSERT INTO geofence_locations (id, name, category, address, latitude, longitude, radius_meters) VALUES
(1, 'Kantor Cabang BPJS Ketenagakerjaan (Pusat)', 'kantor', 'Jl. Gatot Subroto No. 79, Jakarta Selatan', -6.2301000, 106.8227000, 150),
(2, 'Sentra Pasar Tradisional Beringharjo', 'lapangan_pasar', 'Kawasan Binaan BPU Pasar Tradisional', -6.2315000, 106.8240000, 200),
(3, 'Sentra UMKM Binaan Pekerja Rentan', 'lapangan_umkm', 'Pusat Usaha Mikro Mandiri BPU', -6.2285000, 106.8210000, 150),
(4, 'Kawasan Sentra Industri & Bengkel Mandiri', 'lapangan_industri', 'Area Mitra Usaha BPU Lapangan', -6.2330000, 106.8260000, 250)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    latitude = EXCLUDED.latitude, 
    longitude = EXCLUDED.longitude, 
    radius_meters = EXCLUDED.radius_meters;

SELECT setval('geofence_locations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM geofence_locations));

-- 2. LEAVE REQUESTS (Izin, Cuti, Sakit dengan Approval & Dokumen Dokter)
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(20) NOT NULL, -- 'Izin', 'Sakit', 'Cuti'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    proof_file_url TEXT,
    status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Disetujui', 'Ditolak'
    reviewed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    coordinator_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DIRECT MESSAGES (Live Chat Internal Koordinator & Peserta)
CREATE TABLE IF NOT EXISTS direct_messages (
    id BIGSERIAL PRIMARY KEY,
    sender_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    receiver_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. DIGITAL CERTIFICATES WITH CRYPTOGRAPHIC QR CODE
CREATE TABLE IF NOT EXISTS certificates (
    certificate_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    certificate_number VARCHAR(100) NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    predicate VARCHAR(50) DEFAULT 'Sangat Memuaskan (Grade A)',
    score_average NUMERIC(5, 2) DEFAULT 90.00,
    digital_signature_hash VARCHAR(255) NOT NULL,
    batch_name VARCHAR(100) DEFAULT 'Batch 1 - Gelombang 2025/2026',
    status VARCHAR(20) DEFAULT 'Terbit',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed sample certificate if not exists
INSERT INTO certificates (certificate_id, user_id, certificate_number, issue_date, predicate, score_average, digital_signature_hash, batch_name) VALUES
(1, 4, 'BPJS-TK/MAGANG/2026/001', CURRENT_DATE - INTERVAL '15 days', 'Sangat Memuaskan (Grade A)', 94.50, 'a7b8c9d0e1f2038495a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8', 'Batch 1 - Gelombang 2025/2026'),
(2, 1, 'BPJS-TK/MAGANG/2026/002', CURRENT_DATE - INTERVAL '2 days', 'Memuaskan (Grade B)', 86.20, 'f1e2d3c4b5a6978876a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3', 'Batch 1 - Gelombang 2025/2026')
ON CONFLICT (certificate_id) DO NOTHING;

SELECT setval('certificates_certificate_id_seq', (SELECT COALESCE(MAX(certificate_id), 1) FROM certificates));

-- 5. ATTENDANCE_RECORDS ENHANCEMENT
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'selfie_image_url') THEN
        ALTER TABLE attendance_records ADD COLUMN selfie_image_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'geofence_id') THEN
        ALTER TABLE attendance_records ADD COLUMN geofence_id INT REFERENCES geofence_locations(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'distance_meters') THEN
        ALTER TABLE attendance_records ADD COLUMN distance_meters NUMERIC(8, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'is_mock_location') THEN
        ALTER TABLE attendance_records ADD COLUMN is_mock_location BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 6. ACTIVITY_LOGS ENHANCEMENT (Audit Forensik & Anomali)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'is_anomaly') THEN
        ALTER TABLE activity_logs ADD COLUMN is_anomaly BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'anomaly_reason') THEN
        ALTER TABLE activity_logs ADD COLUMN anomaly_reason VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'user_agent') THEN
        ALTER TABLE activity_logs ADD COLUMN user_agent TEXT;
    END IF;
END $$;

-- Sample audit log entries with anomaly flagging for testing
INSERT INTO activity_logs (user_id, activity_type, details, ip_address, is_anomaly, anomaly_reason, user_agent) VALUES
(3, 'LOGIN', 'Admin login via desktop console', '182.253.14.88', FALSE, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0'),
(1, 'LOGIN', 'Percobaan login dari IP baru di luar jam operasional', '103.111.45.19', TRUE, 'Anomali IP & Jam Akses Tidak Wajar (02:45 WIB)', 'Mozilla/5.0 (Android 14; Mobile; rv:122.0) Firefox/122.0'),
(2, 'UPDATE_NILAI', 'Koordinator memverifikasi evaluasi tugas modul BPU', '180.245.12.33', FALSE, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0'),
(3, 'EXPORT_DATA', 'Admin mengekspor laporan akumulasi ke file Excel', '182.253.14.88', FALSE, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0')
ON CONFLICT DO NOTHING;
