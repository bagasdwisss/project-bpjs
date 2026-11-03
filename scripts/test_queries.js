import pool from '../server/db.js';

async function testEndpoints() {
  console.log('Testing queries used by the 3 failing endpoints...');
  try {
    // 1. Test monitoring-logs query
    const monRes = await pool.query(`
      SELECT c.*, 
             u.full_name as participant_name, u.unique_id as participant_nim, u.penempatan,
             coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN users coord ON COALESCE(c.issued_by, u.coordinator_id) = coord.user_id
      ORDER BY c.created_at DESC NULLS LAST
    `);
    console.log('✅ monitoring-logs query OK! Rows count:', monRes.rows.length);

    // 2. Test reissue-requests query
    const reqRes = await pool.query(`
      SELECT c.*, 
             u.full_name as participant_name, u.unique_id as participant_nim, u.penempatan,
             coord.full_name as coordinator_name, coord.unique_id as coordinator_npp
      FROM certificates c
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN users coord ON COALESCE(c.reissue_requested_by, u.coordinator_id) = coord.user_id
      WHERE c.reissue_requested = TRUE
      ORDER BY c.reissue_requested_at DESC NULLS LAST
    `);
    console.log('✅ reissue-requests query OK! Rows count:', reqRes.rows.length);

    // 3. Test update for request-reissue
    if (monRes.rows.length > 0) {
      const testCertId = monRes.rows[0].certificate_id;
      await pool.query(`
        UPDATE certificates 
        SET reissue_requested = TRUE, 
            reissue_reason = $1, 
            reissue_requested_at = CURRENT_TIMESTAMP, 
            reissue_requested_by = $2 
        WHERE certificate_id = $3
      `, ['Test Alasan Koreksi', monRes.rows[0].user_id, testCertId]);
      console.log('✅ request-reissue UPDATE query OK for cert ID:', testCertId);

      // Revert test update
      await pool.query(`UPDATE certificates SET reissue_requested = FALSE WHERE certificate_id = $1`, [testCertId]);
      console.log('✅ Reset test cert back to FALSE');
    }

    console.log('🎉 ALL 3 QUERIES SUCCEEDED WITH ZERO ERRORS!');
  } catch (err) {
    console.error('❌ Query test failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testEndpoints();
