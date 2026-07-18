<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * FIX 4 — IDOR: DaemonProxyController::getRawFile() must scope the Asset lookup to the
 * requesting user, so user B cannot resolve user A's asset out of the DB by guessing the
 * project id + filename.
 */
class RawFileOwnershipTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'daemon.base_url' => 'http://daemon.test',
            'daemon.webhook_secret' => 'test-secret',
            'broadcasting.default' => 'null',
        ]);

        // Daemon fallback (used only when the DB lookup misses) returns a distinct marker.
        Http::fake(['*' => Http::response('DAEMON_FALLBACK', 200, ['Content-Type' => 'text/plain'])]);

        Plan::create([
            'slug' => 'free', 'name' => 'Free',
            'monthly_credits' => 300, 'max_concurrent_jobs' => 1, 'price_regular' => 0,
        ]);
    }

    private function makeUser(): User
    {
        return User::factory()->create(['plan_id' => Plan::first()->id]);
    }

    public function test_owner_resolves_their_asset_but_other_user_does_not(): void
    {
        $owner = $this->makeUser();
        $attacker = $this->makeUser();

        Asset::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'user_id' => $owner->id,
            'type' => 'video',
            'mime_type' => 'video/mp4',
            'path' => 'renders/projA/scene-output.mp4',
            'original_name' => 'scene-output.mp4',
            'size_bytes' => 1024,
        ]);

        // Owner: DB lookup matches -> redirect to signed/download URL (not the daemon marker).
        $this->actingAs($owner, 'api');
        $ownerResponse = $this->get('/api/daemon/projects/projA/raw/output.mp4');
        $ownerResponse->assertRedirect();

        // Attacker: DB lookup is scoped out -> falls through to the daemon fallback marker,
        // i.e. it never served the owner's asset.
        $this->actingAs($attacker, 'api');
        $attackerResponse = $this->get('/api/daemon/projects/projA/raw/output.mp4');
        $attackerResponse->assertStatus(200);
        $this->assertSame('DAEMON_FALLBACK', $attackerResponse->getContent());
    }
}
