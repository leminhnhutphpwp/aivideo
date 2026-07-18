<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\NotificationPreference;

class NotificationPreferenceSeeder extends Seeder
{
    public function run(): void
    {
        $types = ['job_completed', 'job_failed', 'credits_added', 'credits_refunded'];
        $users = User::all();

        foreach ($users as $user) {
            foreach ($types as $type) {
                NotificationPreference::firstOrCreate(
                    ['user_id' => $user->id, 'type' => $type, 'channel' => 'email'],
                    ['enabled' => true]
                );
            }
        }
    }
}
