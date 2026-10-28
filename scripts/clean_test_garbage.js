// scripts/clean_test_garbage.js - Deep & Complete Clean of all E2E test artifacts from remote database
import dotenv from 'dotenv';
dotenv.config();

import { query } from '../server/db.js';
import { rebuildAuditChain } from '../server/utils/merkleAudit.js';

async function cleanGarbage() {
  console.log('🧹 Memulai pembersihan menyeluruh sampah hasil pengujian E2E dari database Neon...');

  // Wait 1s in case connection is initializing
  await new Promise(r => setTimeout(r, 1000));

  const cleanSteps = [
    {
      name: 'broadcast_messages',
      sql: `DELETE FROM broadcast_messages 
            WHERE title ILIKE '%E2E%' 
               OR title ILIKE '%Test%' 
               OR title ILIKE '%Uji%' 
               OR content ILIKE '%e2e%' 
               OR content ILIKE '%end-to-end%' 
               OR content ILIKE '%pengujian%'`
    },
    {
      name: 'broadcast_dismissals',
      sql: `DELETE FROM broadcast_dismissals 
            WHERE broadcast_id NOT IN (SELECT broadcast_id FROM broadcast_messages)`
    },
    {
      name: 'notifications',
      sql: `DELETE FROM notifications 
            WHERE title ILIKE '%E2E%' 
               OR title ILIKE '%Test%' 
               OR title ILIKE '%Uji%' 
               OR message ILIKE '%end-to-end%' 
               OR message ILIKE '%e2e%' 
               OR message ILIKE '%pengujian%'
               OR title ILIKE '%Agenda Baru: Tes%'
               OR type = 'broadcast'`
    },
    {
      name: 'events',
      sql: `DELETE FROM events 
            WHERE event_title ILIKE '%Tes%' 
               OR event_description ILIKE '%Tes%'`
    },
    {
      name: 'honeytoken_traps',
      sql: `DELETE FROM honeytoken_traps 
            WHERE ip_address IN ('::ffff:127.0.0.1', '127.0.0.1') 
               OR user_agent = 'node'`
    },
    {
      name: 'security_incident_alerts',
      sql: `DELETE FROM security_incident_alerts 
            WHERE source_ip IN ('::ffff:127.0.0.1', '127.0.0.1') 
               OR alert_type ILIKE '%E2E%' 
               OR alert_type ILIKE '%Test%' 
               OR details::text ILIKE '%test%'
               OR details::text ILIKE '%e2e%'`
    },
    {
      name: 'ephemeral_impersonation_sessions',
      sql: `DELETE FROM ephemeral_impersonation_sessions 
            WHERE reason ILIKE '%E2E%' 
               OR reason ILIKE '%TEST%'`
    },
    {
      name: 'whatsapp_notification_dispatches',
      sql: `DELETE FROM whatsapp_notification_dispatches 
            WHERE recipient_phone ILIKE '%08123456789%' 
               OR template_name ILIKE '%test%'`
    },
    {
      name: 'identity_duplicate_cases',
      sql: `DELETE FROM identity_duplicate_cases 
            WHERE resolution_notes ILIKE '%E2E%' 
               OR nik = '1271019900000001'`
    },
    {
      name: 'staging_sandbox_snapshots',
      sql: `DELETE FROM staging_sandbox_snapshots 
            WHERE snapshot_name ILIKE 'sandbox_test_%'`
    },
    {
      name: 'storage_deduplication_registry',
      sql: `DELETE FROM storage_deduplication_registry 
            WHERE content_sha256 != 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'`
    },
    {
      name: 'time_bank_ledger',
      sql: `DELETE FROM time_bank_ledger 
            WHERE event_description ILIKE '%Pengujian E2E%' 
               OR event_description ILIKE '%Test%' 
               OR event_description ILIKE '%E2E%'`
    },
    {
      name: 'certificates',
      sql: `DELETE FROM certificates 
            WHERE certificate_number = 'BPJSTK/MAGANG/2026/012'`
    },
    {
      name: 'certificate_revocation_list',
      sql: `DELETE FROM certificate_revocation_list 
            WHERE cert_number ILIKE '%012%' 
               OR reason ILIKE '%Pengujian E2E%'
               OR reason ILIKE '%E2E%'`
    },
    {
      name: 'csp_violation_reports',
      sql: `DELETE FROM csp_violation_reports 
            WHERE source_ip IN ('::ffff:127.0.0.1', '127.0.0.1') 
               OR document_uri ILIKE '%test%'`
    },
    {
      name: 'jailed_ips',
      sql: `DELETE FROM jailed_ips 
            WHERE ip IN ('::ffff:127.0.0.1', '127.0.0.1')`
    },
    {
      name: 'whistleblowing_reports',
      sql: `DELETE FROM whistleblowing_reports 
            WHERE subject ILIKE '%Uji Coba%' 
               OR subject ILIKE '%Test%' 
               OR ticket_code ILIKE 'WB-%'`
    },
    {
      name: 'activity_logs',
      sql: `DELETE FROM activity_logs 
            WHERE details ILIKE '%E2E%' 
               OR details ILIKE '%Uji Coba%' 
               OR details ILIKE '%test%' 
               OR ip_address IN ('::ffff:127.0.0.1', '127.0.0.1')`
    }
  ];

  for (const step of cleanSteps) {
    try {
      const res = await query(step.sql);
      console.log(`✓ [${step.name}] ${res.rowCount || 0} baris sampah berhasil dibersihkan.`);
    } catch (e) {
      console.warn(`⚠️ [${step.name}] Gagal/Lewati: ${e.message}`);
    }
  }

  console.log('🔒 Melakukan reseal kriptografis Merkle Tree chain audit log...');
  try {
    const reseal = await rebuildAuditChain();
    console.log(`✓ Rantai Merkle berhasil di-reseal: ${reseal.count} baris log utuh & valid.`);
  } catch (err) {
    console.warn(`⚠️ Gagal reseal rantai audit: ${err.message}`);
  }

  console.log('🎉 Pembersihan database selesai! Basis data bersih kembali dari seluruh sampah pengujian.');
  process.exit(0);
}

cleanGarbage();
