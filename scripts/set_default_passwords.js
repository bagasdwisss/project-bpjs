// scripts/set_default_passwords.js
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { query } from '../server/db.js';

async function updatePasswords() {
  try {
    console.log('🔄 Menghasilkan hash bcrypt untuk password123...');
    const hash = await bcrypt.hash('password123', 10);
    console.log('Generated hash:', hash);

    console.log('⚙️ Mengupdate seluruh user di database Neon...');
    const res = await query('UPDATE users SET password_hash = $1', [hash]);
    console.log(`✅ Berhasil mengupdate ${res.rowCount} pengguna!`);

    const users = await query('SELECT user_id, unique_id, full_name, role_id, status FROM users ORDER BY user_id');
    console.log('\nDaftar Pengguna Aktif:');
    users.rows.forEach(u => {
      console.log(`- [Role ${u.role_id}] ${u.unique_id} - ${u.full_name} (${u.status})`);
    });

    // Test verify
    const verifyMatch = await bcrypt.compare('password123', hash);
    console.log(`\nVerifikasi bcrypt untuk password123: ${verifyMatch ? 'COCOK ✅' : 'GAGAL ❌'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Gagal update password:', err);
    process.exit(1);
  }
}

updatePasswords();
