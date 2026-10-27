// scripts/clean_test_garbage.js - Clean all E2E test artifacts & test records from remote database
import dotenv from 'dotenv';
dotenv.config();

import { query } from '../server/db.js';
import { rebuildAuditChain } from '../server/utils/merkleAudit.js';

async function cleanGarbage() {
  console.log('🧹 Memulai pembersihan data sampah hasil pengujian E2E dari database...');

  // Wait 16s in case circuit breaker was tripped
  await new Promise(r => setTimeout(r, 16000));

  const cleanSteps = [
    {
      name: 'broadcast_messages',
      sql: `DELETE FROM broadcast_messages WHERE title ILIKE '%Uji Coba%' OR title ILIKE '%Test%' OR content ILIKE '%End to End%'`
    },
    {
      name: 'whistleblowing_reports',
      sql: `DELETE FROM whistleblowing_reports WHERE subject ILIKE '%Uji Coba%' OR subject ILIKE '%Test%' OR ticket_code ILIKE 'WB-%'`
    },
    {
      name: 'certificates',
      sql: `DELETE FROM certificates WHERE certificate_number = 'BPJSTK/MAGANG/2026/012'`
    },
    {
      name: 'certificate_revocation_list',
      sql: `DELETE FROM certificate_revocation_list WHERE cert_number ILIKE '%012%' OR reason ILIKE '%Pengujian E2E%'`
    },
    {
      name: 'jailed_ips',
      sql: `DELETE FROM jailed_ips WHERE ip IN ('::ffff:127.0.0.1', '127.0.0.1')`
    },
    {
      name: 'security_incidents',
      sql: `DELETE FROM security_incidents WHERE title ILIKE '%E2E%' OR details ILIKE '%test%' OR source_ip IN ('::ffff:127.0.0.1', '127.0.0.1')`
    },
    {
      name: 'time_bank_ledger',
      sql: `DELETE FROM time_bank_ledger WHERE reason ILIKE '%Pengujian E2E%' OR reason ILIKE '%Test%'`
    },
    {
      name: 'ephemeral_impersonation_sessions',
      sql: `DELETE FROM ephemeral_impersonation_sessions WHERE reason ILIKE '%E2E%' OR reason ILIKE '%TEST%'`
    },
    {
      name: 'whatsapp_notification_dispatches',
      sql: `DELETE FROM whatsapp_notification_dispatches WHERE recipient_phone ILIKE '%08123456789%' OR template_name ILIKE '%test%'`
    },
    {
      name: 'identity_duplicate_cases',
      sql: `DELETE FROM identity_duplicate_cases WHERE resolution_notes ILIKE '%E2E%' OR conflicting_nik ILIKE '1271019900000001'`
    },
    {
      name: 'staging_sandbox_snapshots',
      sql: `DELETE FROM staging_sandbox_snapshots WHERE snapshot_name ILIKE 'sandbox_test_%'`
    },
    {
      name: 'storage_deduplication_registry',
      sql: `DELETE FROM storage_deduplication_registry WHERE original_filename ILIKE '%e2e%' OR original_filename ILIKE '%dedup-test%'`
    },
    {
      name: 'knowledge_base_documents',
      sql: `DELETE FROM knowledge_base_documents WHERE title ILIKE '%E2E%'`
    },
    {
      name: 'activity_logs',
      sql: `DELETE FROM activity_logs WHERE details ILIKE '%E2E%' OR details ILIKE '%Uji Coba%' OR ip_address IN ('::ffff:127.0.0.1', '127.0.0.1')`
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

  console.log('🎉 Pembersihan database selesai! Basis data bersih kembali dari sampah pengujian.');
  process.exit(0);
}

cleanGarbage();
