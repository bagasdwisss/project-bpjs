<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Seed Roles
        DB::table('roles')->insert([
            ['role_id' => 1, 'role_name' => 'Peserta'],
            ['role_id' => 2, 'role_name' => 'Koordinator'],
            ['role_id' => 3, 'role_name' => 'Administrator'],
        ]);

        // Seed Demo Users
        DB::table('users')->insert([
            [
                'unique_id' => 'PES001',
                'full_name' => 'Ahmad Santoso',
                'password_hash' => Hash::make('pass1'),
                'role_id' => 1,
                'status' => 'Aktif',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'unique_id' => 'KO001',
                'full_name' => 'Surya Adi',
                'password_hash' => Hash::make('pass2'),
                'role_id' => 2,
                'status' => 'Aktif',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'unique_id' => 'ADM001',
                'full_name' => 'Admin Sistem',
                'password_hash' => Hash::make('pass3'),
                'role_id' => 3,
                'status' => 'Aktif',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}