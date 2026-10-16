<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Ambil ID role dari database
        $participantRole = Role::where('name', 'participant')->first();
        $coordinatorRole = Role::where('name', 'coordinator')->first();
        $adminRole = Role::where('name', 'admin')->first();

        // Buat user demo
        User::create([
            'name' => 'Ahmad Santoso',
            'userid' => 'PES001',
            'password' => Hash::make('pass1'), // Gunakan password dari HTML Anda
            'role_id' => $participantRole->id,
        ]);

        User::create([
            'name' => 'Surya Adi',
            'userid' => 'KO001',
            'password' => Hash::make('pass2'),
            'role_id' => $coordinatorRole->id,
        ]);

        User::create([
            'name' => 'Admin Sistem',
            'userid' => 'ADM001',
            'password' => Hash::make('pass3'),
            'role_id' => $adminRole->id,
        ]);
    }
}