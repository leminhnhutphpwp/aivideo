<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Models\User;
use Spatie\Permission\Models\Role;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create super_admin role
        $superAdminRole = Role::firstOrCreate([
            'name' => 'super_admin',
            'guard_name' => 'web',
        ]);

        // Create panel_user role (for API users)
        Role::firstOrCreate([
            'name' => 'panel_user',
            'guard_name' => 'web',
        ]);

        // Create the default admin user
        $admin = User::firstOrCreate(
        ['email' => 'minhnhut1999nb@gmail.com'],
        [
            'name' => 'Admin Website',
            'password' => bcrypt('ihzhGTiEPsKrRaNZ'),
        ]
        );

        // Assign super_admin role
        $admin->assignRole($superAdminRole);

        // Quick test user for frontend login
        $testUser = User::firstOrCreate(
            ['email' => 'minhnhut147nb@gmail.com'],
            [
                'name' => 'Test User',
                'password' => bcrypt('Test@1234'),
            ]
        );
        $testUser->assignRole('panel_user');

        $this->call([
            ShieldSeeder::class,
            EmailTemplateSeeder::class,
            PlanSeeder::class,
            CreditSettingsSeeder::class,
            PricingSystemSeeder::class,
        ]);

        // Upgrade test user to Pro plan with credits for faster testing
        $proPlan = Plan::where('slug', 'pro')->first();
        if ($proPlan && $testUser->plan_id !== $proPlan->id) {
            $testUser->update([
                'plan_id' => $proPlan->id,
                'plan_expires_at' => now()->addYear(),
                'is_active' => true,
                'credits' => $proPlan->effective_credits,
                'email_verified_at' => now(),
            ]);
        }
    }
}