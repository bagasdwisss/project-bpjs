import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function seedKnowledge() {
  const docs = [
    {
      name: 'Buku Saku Regulasi 5 Program Jaminan Sosial (JKK, JKM, JHT, JP, JKP).pdf',
      cat: 'guidelines',
      size: 2450
    },
    {
      name: 'SOP Penugasan Lapangan & Protokol Sosialisasi BPU Pasar Tradisional.pdf',
      cat: 'guidelines',
      size: 1820
    },
    {
      name: 'Pitch Deck & Template Presentasi Sosialisasi UMKM Binaan.pptx',
      cat: 'materials',
      size: 3200
    },
    {
      name: 'Formulir Pendaftaran Mandiri & Berkas Klaim Santunan BPU.pdf',
      cat: 'templates',
      size: 890
    }
  ];

  for (const doc of docs) {
    const check = await pool.query(`SELECT 1 FROM documents WHERE file_name = $1`, [doc.name]);
    if (check.rows.length === 0) {
      await pool.query(
        `INSERT INTO documents (user_id, file_name, file_path, file_type, file_size_kb, category, uploaded_at)
         VALUES (3, $1, $2, 'PDF', $3, $4, CURRENT_TIMESTAMP)`,
        [doc.name, `/documents/${doc.name}`, doc.size, doc.cat]
      );
    }
  }

  console.log('✅ Knowledge Base documents seeded successfully into Neon DB!');
  await pool.end();
}

seedKnowledge().catch(err => {
  console.error('Error seeding knowledge docs:', err);
  process.exit(1);
});
