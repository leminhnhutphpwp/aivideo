<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Plan;
use Awcodes\Curator\Models\Media;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use Tests\TestCase;

class AvatarUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'panel_user', 'guard_name' => 'web']);

        Plan::create([
            'name' => 'Free',
            'slug' => 'free',
            'monthly_credits' => 300,
            'max_concurrent_jobs' => 1,
            'queue_priority' => 'low',
        ]);
    }

    protected function createAuthenticatedUser(): array
    {
        $user = User::factory()->create([
            'password' => bcrypt('password123'),
            'plan_id' => Plan::first()->id,
        ]);
        $user->assignRole('panel_user');

        $token = JWTAuth::fromUser($user);

        return [$user, $token];
    }

    /** @test */
    public function upload_avatar_success()
    {
        [, $token] = $this->createAuthenticatedUser();
        $file = UploadedFile::fake()->createWithContent('avatar.jpg', fakeJpegContent());

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => $file]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('success'));
        $this->assertIsString($response->json('data.avatar_url'));
    }

    /** @test */
    public function media_record_created()
    {
        [, $token] = $this->createAuthenticatedUser();
        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('avatar.jpg', fakeJpegContent())]);

        $this->assertEquals(1, Media::count());
        $media = Media::first();
        $this->assertEquals('avatars', $media->directory);
        $this->assertEquals('jpg', $media->ext);
    }

    /** @test */
    public function file_stored()
    {
        [, $token] = $this->createAuthenticatedUser();
        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('avatar.jpg', fakeJpegContent())]);

        $media = Media::first();
        Storage::disk('public')->assertExists($media->path);
    }

    /** @test */
    public function user_avatar_media_id_updated()
    {
        [$user, $token] = $this->createAuthenticatedUser();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('avatar.jpg', fakeJpegContent())]);

        $user->refresh();
        $this->assertEquals(Media::first()->id, $user->avatar_media_id);
    }

    /** @test */
    public function me_returns_avatar_url()
    {
        [$user, $token] = $this->createAuthenticatedUser();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('avatar.jpg', fakeJpegContent())]);

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->getJson('/api/auth/me');

        $response->assertStatus(200);
        $response->assertJsonStructure(['data' => ['avatar_url']]);
    }

    /** @test */
    public function invalid_file_fails()
    {
        [, $token] = $this->createAuthenticatedUser();

        $response = $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('doc.pdf', '%PDF')]);

        $response->assertStatus(422);
    }

    /** @test */
    public function upload_twice_updates_media_id()
    {
        [$user, $token] = $this->createAuthenticatedUser();

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('a.jpg', fakeJpegContent())]);

        $this->withHeaders(['Authorization' => "Bearer {$token}"])
            ->postJson('/api/settings/avatar', ['avatar' => UploadedFile::fake()->createWithContent('b.jpg', fakeJpegContent())]);

        $user->refresh();
        $this->assertNotNull($user->avatar_media_id);
        $this->assertEquals($user->avatarMedia->id, $user->avatar_media_id);
    }
}

function fakeJpegContent(): string
{
    return base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwA=');
}
