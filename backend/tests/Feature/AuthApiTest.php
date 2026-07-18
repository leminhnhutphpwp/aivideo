<?php
namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    private Plan $freePlan;
    private User $user;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);

        $this->freePlan = Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
            'price_regular' => 0,
        ]);

        $this->user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
            'plan_id' => $this->freePlan->id,
            'credits' => 300,
            'email_verified_at' => now(),
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);
        $this->token = $loginResponse->json('data.token');
    }

    protected function authHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->token];
    }

    public function test_register_success(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['success', 'data' => ['token', 'user']])
            ->assertJson(['success' => true]);

        $this->assertDatabaseHas('users', [
            'email' => 'new@example.com',
            'name' => 'New User',
        ]);
    }

    public function test_register_duplicate_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Another User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_register_validation_errors(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => '',
            'email' => 'not-an-email',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422);
    }

    public function test_register_public(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Public User',
            'email' => 'public@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201);
    }

    public function test_login_success(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data' => ['token', 'user']]);
    }

    public function test_login_wrong_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_nonexistent_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_public(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(200);
    }

    public function test_me_returns_user_data(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->getJson('/api/auth/me');

        $response->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure([
                'success', 'data' => [
                    'uuid', 'name', 'email', 'credits', 'plan',
                ],
            ]);

        $this->assertEquals('test@example.com', $response->json('data.email'));
        $this->assertEquals('Test User', $response->json('data.name'));
        $this->assertEquals(300, $response->json('data.credits'));
    }

    public function test_me_requires_auth(): void
    {
        $this->getJson('/api/auth/me')->assertStatus(401);
    }

    public function test_refresh_returns_new_token(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/auth/refresh');

        $response->assertStatus(200)
            ->assertJsonStructure(['success', 'data' => ['token']]);
    }

    public function test_refresh_requires_auth(): void
    {
        $this->postJson('/api/auth/refresh')->assertStatus(401);
    }

    public function test_logout_invalidates_token(): void
    {
        $this->withHeaders($this->authHeaders())
            ->postJson('/api/auth/logout')
            ->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->withHeaders($this->authHeaders())
            ->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    public function test_logout_requires_auth(): void
    {
        $this->postJson('/api/auth/logout')->assertStatus(401);
    }

    public function test_forgot_password_success(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'test@example.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message']);
    }

    public function test_forgot_password_nonexistent_email(): void
    {
        $response = $this->postJson('/api/auth/forgot-password', [
            'email' => 'nonexistent@example.com',
        ]);

        $response->assertStatus(422);
    }

    public function test_verify_reset_code_success(): void
    {
        $code = '123456';
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => 'test@example.com'],
            ['token' => Hash::make($code), 'created_at' => now()]
        );

        $response = $this->postJson('/api/auth/verify-reset-code', [
            'email' => 'test@example.com',
            'code' => $code,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['message']);
    }

    public function test_verify_reset_code_wrong_code(): void
    {
        $response = $this->postJson('/api/auth/verify-reset-code', [
            'email' => 'test@example.com',
            'code' => '000000',
        ]);

        $response->assertStatus(400);
    }

    public function test_send_verification_success(): void
    {
        $unverifiedUser = User::factory()->create([
            'email' => 'unverified@example.com',
            'password' => bcrypt('password123'),
            'email_verified_at' => null,
            'plan_id' => $this->freePlan->id,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'unverified@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('data.token');

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/send-verification');

        $response->assertStatus(200)
            ->assertJsonStructure(['message']);
    }

    public function test_send_verification_already_verified(): void
    {
        $response = $this->withHeaders($this->authHeaders())
            ->postJson('/api/auth/send-verification');

        $response->assertStatus(400);
    }

    public function test_verify_email_success(): void
    {
        $unverifiedUser = User::factory()->create([
            'email' => 'unverified2@example.com',
            'password' => bcrypt('password123'),
            'email_verified_at' => null,
            'plan_id' => $this->freePlan->id,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'unverified2@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('data.token');

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/send-verification');

        $user = User::where('email', 'unverified2@example.com')->first();

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/verify-email', [
                'code' => $user->email_verification_code,
            ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_verify_email_wrong_code(): void
    {
        $unverifiedUser = User::factory()->create([
            'email' => 'unverified3@example.com',
            'password' => bcrypt('password123'),
            'email_verified_at' => null,
            'plan_id' => $this->freePlan->id,
        ]);

        $loginResponse = $this->postJson('/api/auth/login', [
            'email' => 'unverified3@example.com',
            'password' => 'password123',
        ]);
        $token = $loginResponse->json('data.token');

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/auth/verify-email', ['code' => '000000']);

        $response->assertStatus(400);
    }
}
