-- ========================================================
-- NEON POSTGRESQL SCHEMA FOR BPJS ABSENSI & NILAI
-- ========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    unique_id VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE RESTRICT,
    coordinator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
    penempatan VARCHAR(20) CHECK (penempatan IN ('Kantor', 'Lapangan', NULL)),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. BATCHES TABLE
CREATE TABLE IF NOT EXISTS batches (
    batch_id SERIAL PRIMARY KEY,
    batch_name VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Selesai', 'Mendatang')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. USER_BATCHES TABLE
CREATE TABLE IF NOT EXISTS user_batches (
    user_batch_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    batch_id INT NOT NULL REFERENCES batches(batch_id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. MODULES TABLE
CREATE TABLE IF NOT EXISTS modules (
    module_id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batches(batch_id) ON DELETE SET NULL,
    module_name VARCHAR(150) NOT NULL,
    description TEXT,
    max_score NUMERIC(5,2) DEFAULT 100.00
);

-- 6. PROGRESS TABLE
CREATE TABLE IF NOT EXISTS progress (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    kunjungan_bpu INT NOT NULL DEFAULT 0,
    hasil_akuisisi_bpu INT NOT NULL DEFAULT 0,
    kunjungan_pu INT NOT NULL DEFAULT 0,
    video_viralisasi INT NOT NULL DEFAULT 0,
    kehadiran_seminar INT NOT NULL DEFAULT 0,
    kehadiran_sosialisasi INT NOT NULL DEFAULT 0,
    total_poin INT NOT NULL DEFAULT 0,
    nilai INT NOT NULL DEFAULT 0,
    grade CHAR(1) DEFAULT 'E',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. PESERTA (ACQUISITION / REGISTRATION DETAILS)
CREATE TABLE IF NOT EXISTS peserta (
    peserta_id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    nama_peserta VARCHAR(100),
    nik VARCHAR(20),
    tanggal_pendaftaran DATE NOT NULL DEFAULT CURRENT_DATE,
    no_telepon VARCHAR(20),
    pekerjaan VARCHAR(100),
    email VARCHAR(100),
    status_pendaftaran VARCHAR(50) NOT NULL DEFAULT 'BARU DAFTAR' CHECK (status_pendaftaran IN ('BARU DAFTAR', 'MENUNGGU PEMBAYARAN', 'PEMBAYARAN BERHASIL', 'PEMBAYARAN', 'LENGKAP')),
    periode_pelatihan VARCHAR(20),
    biaya NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    program_terdaftar VARCHAR(255),
    bukti_pembayaran_link TEXT,
    bukti_sosialisasi_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ATTENDANCE_RECORDS TABLE
CREATE TABLE IF NOT EXISTS attendance_records (
    attendance_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat')),
    notes TEXT,
    location_coordinates VARCHAR(100),
    location_address TEXT,
    ip_address VARCHAR(45),
    device_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. SCORES TABLE
CREATE TABLE IF NOT EXISTS scores (
    score_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    module_id INT REFERENCES modules(module_id) ON DELETE SET NULL,
    coordinator_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    score_value NUMERIC(5,2) NOT NULL,
    comments TEXT,
    graded_at DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. EVENTS TABLE
CREATE TABLE IF NOT EXISTS events (
    event_id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES batches(batch_id) ON DELETE SET NULL,
    event_title VARCHAR(150) NOT NULL,
    event_description TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    priority VARCHAR(20) DEFAULT 'medium',
    due_date DATE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. FORUM TOPICS TABLE
CREATE TABLE IF NOT EXISTS forum_topics (
    topic_id SERIAL PRIMARY KEY,
    topic_name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    is_sticky BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. FORUM MESSAGES TABLE
CREATE TABLE IF NOT EXISTS forum_messages (
    message_id SERIAL PRIMARY KEY,
    topic_id INT NOT NULL REFERENCES forum_topics(topic_id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    document_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(50),
    file_size_kb INT,
    category VARCHAR(50) DEFAULT 'guidelines',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. BROADCAST_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS broadcast_messages (
    broadcast_id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Biasa',
    target_role VARCHAR(50) DEFAULT 'all',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 16. ACTIVITY_LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    activity_type VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 17. REPORT_LOGS TABLE
CREATE TABLE IF NOT EXISTS report_logs (
    log_id SERIAL PRIMARY KEY,
    report_name VARCHAR(100) NOT NULL,
    generated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_format VARCHAR(10),
    file_path TEXT
);

-- 18. BACKUP_LOGS TABLE
CREATE TABLE IF NOT EXISTS backup_logs (
    backup_id SERIAL PRIMARY KEY,
    backup_name VARCHAR(150) NOT NULL,
    file_path TEXT,
    file_size_kb INT,
    created_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================================
-- POSTGRESQL VIEWS
-- ========================================================

DROP VIEW IF EXISTS coordinator_view;
CREATE VIEW coordinator_view AS 
SELECT user_id, concat(full_name, ' (ID:', user_id, ')') AS label 
FROM users 
WHERE role_id = 2;

DROP VIEW IF EXISTS view_dropdown_koordinator;
CREATE VIEW view_dropdown_koordinator AS 
SELECT user_id, concat(full_name, ' (', unique_id, ')') AS label 
FROM users 
WHERE role_id = 2;

DROP VIEW IF EXISTS view_koordinator;
CREATE VIEW view_koordinator AS 
SELECT user_id, full_name, unique_id 
FROM users 
WHERE role_id = 2;

DROP VIEW IF EXISTS view_users_with_coordinator_name;
CREATE VIEW view_users_with_coordinator_name AS 
SELECT u.user_id, u.unique_id, u.full_name AS user_name, r.role_name, c.full_name AS coordinator_name, u.status, u.penempatan 
FROM users u 
JOIN roles r ON u.role_id = r.role_id 
LEFT JOIN users c ON u.coordinator_id = c.user_id;

DROP VIEW IF EXISTS user_data_with_coordinator_name;
CREATE VIEW user_data_with_coordinator_name AS 
SELECT u.user_id, u.unique_id, u.full_name AS user_name, r.role_name, c.full_name AS coordinator_name, u.status, u.penempatan, u.created_at, u.updated_at 
FROM users u 
JOIN roles r ON u.role_id = r.role_id 
LEFT JOIN users c ON u.coordinator_id = c.user_id;

-- ========================================================
-- SEED DATA (ROLES & USERS)
-- Default password for seeded accounts: password123
-- (Bcrypt hash: $2a$10$w4r0qK8e.vXvEw90w1vKz.LhW95Q.UeE7l3yH52S7bVf942N0c8p2)
-- ========================================================

INSERT INTO roles (role_id, role_name) VALUES
(1, 'Peserta'),
(2, 'Koordinator'),
(3, 'Administrator')
ON CONFLICT (role_id) DO UPDATE SET role_name = EXCLUDED.role_name;

SELECT setval('roles_role_id_seq', (SELECT MAX(role_id) FROM roles));

-- Default password hash for 'password123'
-- $2b$10$qR6j5k2QzI0e2ZqgNl.vO.K7yXQGq5yRzJq8mU4JdF1vN6lXfNqX2 or original hash
INSERT INTO users (user_id, unique_id, full_name, password_hash, role_id, coordinator_id, status, penempatan, created_at, updated_at) VALUES
(3, 'ADM001', 'Admin Sistem', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 3, NULL, 'Aktif', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'KO001', 'Fedro', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 2, NULL, 'Aktif', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(5, 'KO002', 'Afiyah', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 2, NULL, 'Aktif', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(6, 'KO003', 'Fizka', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 2, NULL, 'Aktif', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(7, 'KO004', 'Paramitha', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 2, NULL, 'Aktif', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'PES001', 'Arthur', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 5, 'Aktif', 'Lapangan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(4, 'PES002', 'Widi Iskandar Rangkuti', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 2, 'Aktif', 'Kantor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(8, 'PES003', 'Adinda Putri Anggraini', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 6, 'Aktif', 'Kantor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(9, 'PES004', 'Novita Monic Simanungkalit', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 2, 'Aktif', 'Lapangan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(10, 'Pes006', 'arip', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 2, 'Aktif', 'Kantor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(11, 'Pes0069', 'kyoto', '$2a$10$tZ20k9/h78Q9Q23Q/aN1wOFdNu04yG5OqXz5c1aHl6eM74z7J3p.e', 1, 6, 'Aktif', 'Kantor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (user_id) DO UPDATE SET 
  unique_id = EXCLUDED.unique_id,
  full_name = EXCLUDED.full_name,
  password_hash = EXCLUDED.password_hash,
  role_id = EXCLUDED.role_id,
  coordinator_id = EXCLUDED.coordinator_id,
  status = EXCLUDED.status,
  penempatan = EXCLUDED.penempatan;

SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));

-- SEED BATCHES
INSERT INTO batches (batch_id, batch_name, start_date, end_date, status) VALUES
(1, 'Batch 1 - Gelombang 2025/2026', '2025-10-01', '2026-03-31', 'Aktif'),
(2, 'Batch 2 - Khusus Lapangan', '2025-11-01', '2026-04-30', 'Aktif')
ON CONFLICT (batch_id) DO NOTHING;

SELECT setval('batches_batch_id_seq', (SELECT MAX(batch_id) FROM batches));

-- SEED MODULES
INSERT INTO modules (module_id, batch_id, module_name, description, max_score) VALUES
(1, 1, 'Pengantar Jaminan Sosial', 'Dasar-dasar regulasi BPJS Ketenagakerjaan', 100.00),
(2, 1, 'Akuisisi Kepesertaan BPU', 'Teknik komunikasi dan akuisisi pekerja informal', 100.00),
(3, 1, 'Kunjungan dan Edukasi PU', 'Prosedur kunjungan pemberi kerja', 100.00),
(4, 1, 'Digital Marketing & Viralisasi', 'Pembuatan konten edukasi digital', 100.00)
ON CONFLICT (module_id) DO NOTHING;

SELECT setval('modules_module_id_seq', (SELECT MAX(module_id) FROM modules));

-- SEED PROGRESS
INSERT INTO progress (id, user_id, kunjungan_bpu, hasil_akuisisi_bpu, kunjungan_pu, video_viralisasi, kehadiran_seminar, kehadiran_sosialisasi, total_poin, nilai, grade) VALUES
(1, 4, 35, 20, 7, 1, 3, 3, 100, 100, 'A'),
(4, 9, 30, 20, 7, 1, 2, 1, 100, 100, 'A'),
(5, 1, 15, 10, 3, 1, 1, 1, 65, 75, 'B')
ON CONFLICT (id) DO NOTHING;

SELECT setval('progress_id_seq', (SELECT MAX(id) FROM progress));

-- SEED PESERTA DETAILS
INSERT INTO peserta (peserta_id, user_id, nama_peserta, nik, tanggal_pendaftaran, no_telepon, pekerjaan, email, status_pendaftaran, periode_pelatihan, biaya, program_terdaftar) VALUES
(1, 1, 'Arthur', '3201012345678901', '2025-12-08', '081234567890', 'Peserta Magang', 'arthur@bpjs.test', 'BARU DAFTAR', '6bulan', 333.00, 'JKK,JKM'),
(2, 1, 'asepp', '3201012345678902', '2025-12-14', '081234567891', 'Wiraswasta', 'bagas@gmail.com', 'PEMBAYARAN BERHASIL', '6bulan', 44.00, 'JKK,JKM,JHT'),
(3, 1, 'Widi Iskandar', '3201012345678903', '2026-01-03', '081234567892', 'Freelancer', 'widi@gmail.com', 'MENUNGGU PEMBAYARAN', '11bulan', 100000.00, 'JKK,JKM')
ON CONFLICT (peserta_id) DO NOTHING;

SELECT setval('peserta_peserta_id_seq', (SELECT MAX(peserta_id) FROM peserta));

-- SEED SAMPLE FORUM TOPICS
INSERT INTO forum_topics (topic_id, topic_name, description, created_by, is_sticky) VALUES
(1, 'Panduan Memulai Program & Teknis Lapangan', 'Diskusi seputar SOP kunjungan dan sosialisasi program', 3, TRUE),
(2, 'Kendala Pengisian Data dan Administrasi', 'Tanya jawab seputar pelaporan data akuisisi', 2, FALSE)
ON CONFLICT (topic_id) DO NOTHING;

SELECT setval('forum_topics_topic_id_seq', (SELECT MAX(topic_id) FROM forum_topics));

-- SEED SAMPLE FORUM MESSAGES
INSERT INTO forum_messages (topic_id, user_id, message_content) VALUES
(1, 2, 'Selamat datang rekan-rekan peserta magang BPJS. Silakan ajukan pertanyaan terkait kegiatan di forum ini.'),
(1, 1, 'Siap Pak Koordinator, terima kasih atas arahannya.')
ON CONFLICT DO NOTHING;

-- SEED SAMPLE NOTIFICATIONS
INSERT INTO notifications (user_id, title, message, type, priority, is_read) VALUES
(1, 'Selamat Datang!', 'Selamat datang di Sistem Absensi & Penilaian BPJS Ketenagakerjaan.', 'info', 'medium', FALSE),
(4, 'Update Penilaian', 'Nilai progress minggu ini telah diverifikasi koordinator.', 'success', 'high', FALSE)
ON CONFLICT DO NOTHING;

-- SEED SAMPLE EVENTS
INSERT INTO events (batch_id, event_title, event_description, start_datetime, end_datetime, created_by) VALUES
(1, 'Sosialisasi Akuisisi BPU', 'Briefing teknis pendekatan kelompok pekerja rentan dan bukan penerima upah', CURRENT_TIMESTAMP + INTERVAL '1 day', CURRENT_TIMESTAMP + INTERVAL '1 day 2 hours', 2),
(1, 'Evaluasi Mingguan Koordinator', 'Review pencapaian target dan evaluasi kendala di lapangan', CURRENT_TIMESTAMP + INTERVAL '3 days', CURRENT_TIMESTAMP + INTERVAL '3 days 2 hours', 2)
ON CONFLICT DO NOTHING;