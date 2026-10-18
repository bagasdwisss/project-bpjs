-- scripts/create_declarative_partitioning.sql
-- FEATURE 7: POSTGRESQL DECLARATIVE PARTITIONING FOR ATTENDANCE & AUDIT LOGS

-- 1. Partitioned Table: attendance_records_partitioned
CREATE TABLE IF NOT EXISTS attendance_records_partitioned (
    attendance_id BIGSERIAL,
    user_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'Hadir',
    notes TEXT,
    location_coordinates VARCHAR(100),
    location_address TEXT,
    ip_address VARCHAR(45),
    device_info TEXT,
    selfie_image_url TEXT,
    geofence_id INT,
    distance_meters NUMERIC(10,2),
    is_mock_location BOOLEAN DEFAULT FALSE,
    watermark_signature VARCHAR(128),
    sensor_telemetry JSONB,
    is_offline_sync BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (attendance_id, attendance_date)
) PARTITION BY RANGE (attendance_date);

-- Year 2025 Partition
CREATE TABLE IF NOT EXISTS attendance_records_2025 PARTITION OF attendance_records_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Year 2026 Partition (Current Active Year)
CREATE TABLE IF NOT EXISTS attendance_records_2026 PARTITION OF attendance_records_partitioned
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Year 2027 Partition (Future Year)
CREATE TABLE IF NOT EXISTS attendance_records_2027 PARTITION OF attendance_records_partitioned
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Default Partition for Out-of-Range Dates
CREATE TABLE IF NOT EXISTS attendance_records_default PARTITION OF attendance_records_partitioned
    DEFAULT;

-- 2. Partitioned Table: activity_logs_partitioned
CREATE TABLE IF NOT EXISTS activity_logs_partitioned (
    log_id BIGSERIAL,
    user_id INT,
    activity_type VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_reason VARCHAR(255),
    user_agent TEXT,
    device_fingerprint VARCHAR(128),
    prev_hash VARCHAR(64),
    current_hash VARCHAR(64),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (log_id, created_at)
) PARTITION BY RANGE (created_at);

-- Year 2025 Partition
CREATE TABLE IF NOT EXISTS activity_logs_2025 PARTITION OF activity_logs_partitioned
    FOR VALUES FROM ('2025-01-01 00:00:00') TO ('2026-01-01 00:00:00');

-- Year 2026 Partition
CREATE TABLE IF NOT EXISTS activity_logs_2026 PARTITION OF activity_logs_partitioned
    FOR VALUES FROM ('2026-01-01 00:00:00') TO ('2027-01-01 00:00:00');

-- Year 2027 Partition
CREATE TABLE IF NOT EXISTS activity_logs_2027 PARTITION OF activity_logs_partitioned
    FOR VALUES FROM ('2027-01-01 00:00:00') TO ('2028-01-01 00:00:00');

-- Default Partition
CREATE TABLE IF NOT EXISTS activity_logs_default PARTITION OF activity_logs_partitioned
    DEFAULT;
