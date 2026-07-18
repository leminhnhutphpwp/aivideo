<?php

namespace Tests\Feature;

use App\Models\User;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

/**
 * FIX 1 — Broken access control: the Filament admin panel (/admin) must only admit
 * super_admin users. Every registered API user gets the `panel_user` role and is_active,
 * so the panel gate must NOT rely on is_active alone.
 */
class PanelAccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);
    }

    public function test_regular_active_panel_user_cannot_access_admin_panel(): void
    {
        $panel = Filament::getPanel('admin');

        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('panel_user');

        $this->assertFalse($user->canAccessPanel($panel));
    }

    public function test_user_without_any_role_cannot_access_admin_panel(): void
    {
        $panel = Filament::getPanel('admin');

        $user = User::factory()->create(['is_active' => true]);

        $this->assertFalse($user->canAccessPanel($panel));
    }

    public function test_super_admin_can_access_admin_panel(): void
    {
        $panel = Filament::getPanel('admin');

        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('super_admin');

        $this->assertTrue($admin->canAccessPanel($panel));
    }

    public function test_inactive_super_admin_cannot_access_admin_panel(): void
    {
        $panel = Filament::getPanel('admin');

        $admin = User::factory()->create(['is_active' => false]);
        $admin->assignRole('super_admin');

        $this->assertFalse($admin->canAccessPanel($panel));
    }

    public function test_report_policy_denies_non_admin_and_allows_admin(): void
    {
        $user = User::factory()->create();
        $user->assignRole('panel_user');
        $admin = User::factory()->create();
        $admin->assignRole('super_admin');

        $policy = new \App\Policies\ReportPolicy();

        $this->assertFalse($policy->viewAny($user));
        $this->assertTrue($policy->viewAny($admin));
    }
}
