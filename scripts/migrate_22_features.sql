-- =========================================================================
-- MIGRATION: 22 ENTERPRISE FEATURES FOR BPJSTK SYSTEM
-- =========================================================================

-- 1. Merkle Audit Trail & Device Fingerprinting on activity_logs
ALTER TABLE activity_logs 
ADD COLUMN IF NOT EXISTS prev_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS current_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_activity_logs_current_hash ON activity_logs(current_hash);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- 2. Watermarking, Anti-Mock Sensor Telemetry & Offline Sync on attendance_records
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS watermark_signature VARCHAR(128),
ADD COLUMN IF NOT EXISTS sensor_telemetry JSONB,
ADD COLUMN IF NOT EXISTS is_offline_sync BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_attendance_records_date_user ON attendance_records(attendance_date, user_id);

-- 3. Digital Signatures on certificates
ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS digital_signature VARCHAR(128),
ADD COLUMN IF NOT EXISTS signature_algorithm VARCHAR(32) DEFAULT 'HMAC-SHA256',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- 4. Dynamic System Settings (Maintenance Mode & Master Security PIN)
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

-- Seed default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('maintenance_mode', 'false', 'Saklar Mode Pemeliharaan (true/false)'),
('maintenance_message', 'Sistem Absensi & Nilai BPJSTK sedang dalam pemeliharaan berkala untuk peningkatan infrastruktur.', 'Pesan saat pemeliharaan aktif'),
('maintenance_estimated_end', '', 'Estimasi waktu pemeliharaan selesai (ISO string)'),
('master_security_pin_hash', '$2b$10$0PI6Y9S8btRBiK89dNhwWOK5d593S0.0FvnbhszwsCmriSu2vCqPK', 'PIN Keamanan Master untuk Kontrol Ganda (default: password123 / 123456)')
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Two-Person Control / Dual Approval Rule for High-Risk Actions
CREATE TABLE IF NOT EXISTS pending_approvals (
    approval_id SERIAL PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL,
    action_title VARCHAR(200) NOT NULL,
    payload JSONB NOT NULL,
    reason TEXT,
    requested_by INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    approved_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_approvals_status ON pending_approvals(status);

-- 6. Cold Storage Archival Tables for Chat & Outdated Logs
CREATE TABLE IF NOT EXISTS archived_messages (
    message_id INT,
    sender_id INT,
    receiver_id INT,
    message TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS archived_activity_logs (
    log_id INT,
    user_id INT,
    activity_type VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP,
    prev_hash VARCHAR(64),
    current_hash VARCHAR(64),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Digital Brochures & Field Socialization Materials Catalog
CREATE TABLE IF NOT EXISTS digital_brochures (
    brochure_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    target_audience VARCHAR(100) DEFAULT 'Pekerja Mandiri / BPU',
    summary TEXT,
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    download_count INT DEFAULT 0,
    share_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial official BPJSTK BPU brochures & flyers
INSERT INTO digital_brochures (brochure_id, title, category, target_audience, summary, file_url, thumbnail_url) VALUES
(1, 'Brosur Program Jaminan Kecelakaan Kerja & Kematian (JKK & JKM) BPU', 'Brosur Resmi', 'Pedagang Pasar, Driver Ojol, Petani, Nelayan', 'Panduan iuran Rp16.800/bulan dengan perlindungan santunan kematian hingga Rp42 Juta dan beasiswa anak hingga Rp174 Juta.', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=200&auto=format&fit=crop&q=60'),
(2, 'Infografis Skema 3 Program BPU (+ Jaminan Hari Tua / JHT)', 'Infografis', 'Wiraswasta, Pekerja Seni, Profesional Mandiri', 'Simulasi tabungan masa tua terjangkau mulai dari total iuran Rp36.800/bulan (JKK + JKM + JHT Rp20.000).', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=200&auto=format&fit=crop&q=60'),
(3, 'Naskah Panduan Edukasi & Script Komunikasi Lapangan', 'Materi Edukasi Lapangan', 'Peserta Magang Lapangan', 'Tata cara pendekatan humanis kepada kelompok pedagang pasar, jawaban atas keberatan umum warga, dan cara pendaftaran instan.', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=200&auto=format&fit=crop&q=60')
ON CONFLICT (brochure_id) DO NOTHING;

SELECT setval('digital_brochures_brochure_id_seq', (SELECT COALESCE(MAX(brochure_id), 1) FROM digital_brochures));

-- 8. Velocity Spike Flag column on peserta
ALTER TABLE peserta
ADD COLUMN IF NOT EXISTS fraud_flag VARCHAR(50) DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS submission_velocity_ip VARCHAR(45);

CREATE INDEX IF NOT EXISTS idx_peserta_fraud_flag ON peserta(fraud_flag);
