<?php
namespace Tests\Feature;

use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SocialiteTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);

        Plan::create([
            'slug' => 'free',
            'name' => 'Free',
            'monthly_credits' => 100,
            'price_regular' => 0,
            'queue_priority' => 'low',
            'bonus_credits' => 100,
        ]);
    }

    public function test_redirect_returns_google_oauth_url(): void
    {
        $provider = Mockery::mock('stdClass');
        $provider->shouldReceive('stateless->redirect->getTargetUrl')
            ->andReturn('https://accounts.google.com/o/oauth2/auth?client_id=xxx&redirect_uri=yyy');

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->getJson('/api/auth/google/redirect');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $response->assertJsonStructure(['success', 'data' => ['url']]);
        $this->assertStringContainsString('accounts.google.com', $response->json('data.url'));
    }

    public function test_callback_creates_new_user(): void
    {
        $socialiteUser = (new SocialiteUser())->setRaw([
            'sub' => 'google-id-123',
            'email' => 'newuser@gmail.com',
            'email_verified' => true,
            'name' => 'New Google User',
            'picture' => 'https://example.com/avatar.jpg',
        ])->map([
            'id' => 'google-id-123',
            'nickname' => null,
            'name' => 'New Google User',
            'email' => 'newuser@gmail.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        $provider = Mockery::mock('stdClass');
        $provider->shouldReceive('stateless->user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('token=', $location);

        $user = User::where('email', 'newuser@gmail.com')->first();
        $this->assertNotNull($user);
        $this->assertEquals('google-id-123', $user->google_id);
        $this->assertEquals('New Google User', $user->name);
        $this->assertDatabaseHas('users', [
            'email' => 'newuser@gmail.com',
            'google_id' => 'google-id-123',
        ]);
        $this->assertNotNull(
            \Illuminate\Support\Facades\DB::table('users')
                ->where('email', 'newuser@gmail.com')
                ->value('email_verified_at'),
            'email_verified_at is null in DB'
        );
        $this->assertEquals(100, $user->credits);
    }

    public function test_callback_logs_in_existing_google_user(): void
    {
        $user = User::factory()->create([
            'google_id' => 'existing-google-id',
            'email' => 'existing@gmail.com',
            'email_verified_at' => now(),
        ]);

        $socialiteUser = (new SocialiteUser())->setRaw([
            'sub' => 'existing-google-id',
            'email' => 'existing@gmail.com',
            'email_verified' => true,
            'name' => 'Existing User',
            'picture' => 'https://example.com/avatar.jpg',
        ])->map([
            'id' => 'existing-google-id',
            'nickname' => null,
            'name' => 'Existing User',
            'email' => 'existing@gmail.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        $provider = Mockery::mock('stdClass');
        $provider->shouldReceive('stateless->user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('token=', $location);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_callback_links_existing_email_user(): void
    {
        $user = User::factory()->create([
            'google_id' => null,
            'email' => 'existing@gmail.com',
            'password' => bcrypt('password'),
            'email_verified_at' => now(),
        ]);

        $socialiteUser = (new SocialiteUser())->setRaw([
            'sub' => 'new-google-id-456',
            'email' => 'existing@gmail.com',
            'email_verified' => true,
            'name' => 'Existing User',
            'picture' => 'https://example.com/avatar.jpg',
        ])->map([
            'id' => 'new-google-id-456',
            'nickname' => null,
            'name' => 'Existing User',
            'email' => 'existing@gmail.com',
            'avatar' => 'https://example.com/avatar.jpg',
        ]);

        $provider = Mockery::mock('stdClass');
        $provider->shouldReceive('stateless->user')->andReturn($socialiteUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('token=', $location);

        $this->assertDatabaseHas('users', [
            'email' => 'existing@gmail.com',
            'google_id' => 'new-google-id-456',
        ]);

        $this->assertDatabaseCount('users', 1);
    }

    public function test_callback_handles_socialite_exception(): void
    {
        $provider = Mockery::mock('stdClass');
        $provider->shouldReceive('stateless->user')
            ->andThrow(new \Exception('Google API error'));

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/api/auth/google/callback');

        $response->assertStatus(302);
        $location = $response->headers->get('Location');
        $this->assertStringContainsString('error=', $location);
    }
}
