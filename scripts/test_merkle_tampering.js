import { verifyAuditChainIntegrity } from '../server/utils/merkleAudit.js';
import { query } from '../server/db.js';

async function runTamperTest() {
  console.log('--- TEST 1: Baseline Verification on clean database ---');
  const baseline = await verifyAuditChainIntegrity();
  console.log('Baseline result:', baseline);
  if (!baseline.isValid) {
    console.error('❌ Baseline should be valid!');
    process.exit(1);
  }
  console.log('✅ Baseline verified: Chain is 100% valid.');

  console.log('\n--- TEST 2: Simulate Direct Database Log Tampering ---');
  // Fetch a middle log
  const logRes = await query('SELECT log_id, details FROM activity_logs ORDER BY log_id DESC LIMIT 1 OFFSET 5');
  const targetLog = logRes.rows[0];
  const originalDetails = targetLog.details;

  // Tamper directly in DB
  await query('UPDATE activity_logs SET details = $1 WHERE log_id = $2', [
    'TAMPERED_DETAILS_INJECTED_DIRECTLY_INTO_DB',
    targetLog.log_id
  ]);
  console.log(`Tampered log_id #${targetLog.log_id} in DB.`);

  // Verify that system detects the tampering
  const tamperedCheck = await verifyAuditChainIntegrity();
  console.log('Tamper check result:', tamperedCheck);

  if (tamperedCheck.isValid === false && tamperedCheck.tamperedAt === targetLog.log_id) {
    console.log(`✅ SUCCESS: Tampering at log #${targetLog.log_id} DETECTED! Message: ${tamperedCheck.message}`);
  } else {
    console.error('❌ FAILED: Tampering was NOT detected!');
    process.exit(1);
  }

  // Restore log details
  await query('UPDATE activity_logs SET details = $1 WHERE log_id = $2', [
    originalDetails,
    targetLog.log_id
  ]);
  console.log(`Restored log #${targetLog.log_id} to original content.`);

  const restoredCheck = await verifyAuditChainIntegrity();
  console.log('Restored check:', restoredCheck.isValid ? 'VALID ✅' : 'INVALID ❌');
  if (!restoredCheck.isValid) {
    console.error('❌ Restoration failed!');
    process.exit(1);
  }

  console.log('\n--- TEST 3: Simulate Database State Tampering (Illegal Progress Score) ---');
  await query('UPDATE progress SET nilai = 150 WHERE id = 1');
  const scoreTamperCheck = await verifyAuditChainIntegrity();
  console.log('Progress tamper check result:', scoreTamperCheck);

  if (scoreTamperCheck.isValid === false && scoreTamperCheck.tamperType === 'PROGRESS_INFLATION_DETECTED') {
    console.log(`✅ SUCCESS: Direct database progress inflation DETECTED! Message: ${scoreTamperCheck.message}`);
  } else {
    console.error('❌ FAILED: Progress tampering was NOT detected!');
    process.exit(1);
  }

  // Restore progress
  await query('UPDATE progress SET nilai = 100 WHERE id = 1');
  console.log('Progress restored.');

  const finalCheck = await verifyAuditChainIntegrity();
  console.log('Final check:', finalCheck.isValid ? 'VALID ✅' : 'INVALID ❌');
  if (!finalCheck.isValid) {
    console.error('❌ Final check failed!');
    process.exit(1);
  }

  console.log('\n🎉 ALL MERKLE AUDIT ANTI-TAMPER TESTS PASSED WITH 100% RELIABILITY!');
  process.exit(0);
}

runTamperTest();
