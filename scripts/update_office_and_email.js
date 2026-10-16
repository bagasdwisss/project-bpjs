import { query } from '../server/db.js';

async function updateDb() {
  try {
    console.log('1. Adding email column to users table if not exists...');
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email VARCHAR(255);
    `);
    
    await query(`
      UPDATE users 
      SET email = LOWER(unique_id) || '@bpjsketenagakerjaan.go.id' 
      WHERE email IS NULL OR email = '';
    `);
    console.log('Users email column updated successfully.');

    console.log('2. Updating office geofence location to BPJS Kapten Patimura Medan...');
    // Check if ID 1 exists
    const g1 = await query(`SELECT * FROM geofence_locations WHERE id = 1`);
    if (g1.rows.length > 0) {
      await query(`
        UPDATE geofence_locations
        SET name = 'Kantor Cabang BPJS Ketenagakerjaan Medan Kota',
            address = 'Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
            latitude = 3.575556,
            longitude = 98.665278,
            radius_meters = 150,
            category = 'kantor',
            is_active = TRUE
        WHERE id = 1
      `);
    } else {
      await query(`
        INSERT INTO geofence_locations (name, address, latitude, longitude, radius_meters, category, is_active)
        VALUES (
          'Kantor Cabang BPJS Ketenagakerjaan Medan Kota',
          'Jl. Kapten Patimura No.334 Lantai 1, Darat, Kec. Medan Baru, Kota Medan, Sumatera Utara 20153',
          3.575556,
          98.665278,
          150,
          'kantor',
          TRUE
        )
      `);
    }
    console.log('Geofence location updated successfully.');

    const checkG = await query(`SELECT * FROM geofence_locations WHERE id = 1`);
    console.log('Current office geofence:', checkG.rows[0]);

    process.exit(0);
  } catch (err) {
    console.error('Error updating DB:', err);
    process.exit(1);
  }
}

updateDb();
