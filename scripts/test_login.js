// scripts/test_login.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../server/db.js';

async function testAllLogins() {
  const usersToTest = ['ADM001', 'KO001', 'PES001'];
  console.log('🧪 Memulai Pengujian Login untuk Semua Role...\n');

  for (const uid of usersToTest) {
    const userRes = await query(
      `SELECT u.*, r.role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.role_id
       WHERE LOWER(u.unique_id) = LOWER($1)`,
      [uid]
    );

    if (userRes.rows.length === 0) {
      console.error(`❌ User ${uid} TIDAK DITEMUKAN`);
      continue;
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare('password123', user.password_hash);

    if (isMatch) {
      console.log(`✅ [LOGIN SUKSES] ${uid} (${user.full_name}) | Role: ${user.role_name}`);
      const token = jwt.sign(
        { user_id: user.user_id, unique_id: user.unique_id, role_id: user.role_id, role: user.role_name },
        process.env.JWT_SECRET || 'bpjs-super-secret-key-2026-vercel-neon',
        { expiresIn: '7d' }
      );
      console.log(`   JWT Token: ${token.substring(0, 30)}...`);
    } else {
      console.error(`❌ Password tidak cocok untuk ${uid}`);
    }
  }

  console.log('\n🎉 Seluruh Pengujian Login Selesai!');
  process.exit(0);
}

testAllLogins();
