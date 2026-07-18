<?php

namespace Tests\Feature;

use App\Jobs\HandleJobCompletion;
use App\Jobs\HandleJobFailure;
use App\Models\RenderJob;
use App\Models\User;
use App\Services\DaemonClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class WebhookFlowTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private RenderJob $job;

    protected function setUp(): void
    {
        parent::setUp();

        Bus::fake([HandleJobCompletion::class, HandleJobFailure::class]);

        Config::set('daemon.webhook_secret', 'test-webhook-secret');

        $this->user = User::factory()->create([
            'email_verified_at' => now(),
            'credits' => 100,
        ]);

        $this->job = RenderJob::create([
            'user_id' => $this->user->id,
            'uuid' => 'test-job-uuid-1234',
            'model' => 'wan2.6-t2v',
            'capability' => 't2v',
            'status' => 'processing',
            'prompt' => 'test prompt for rendering',
            'credits_cost' => 10,
            'duration_seconds' => 5,
            'daemon_project_id' => 'daemon-project-123',
            'daemon_task_id' => 'daemon-task-123',
            'parameters' => ['prompt' => 'test prompt'],
        ]);
    }

    public function test_webhook_signature_verification_rejects_invalid_signature(): void
    {
        $daemonClient = app(DaemonClient::class);

        $payload = json_encode(['taskId' => 'task-1', 'status' => 'completed']);
        $validSignature = hash_hmac('sha256', $payload, 'test-webhook-secret');

        $this->assertTrue($daemonClient->verifyWebhookSignature($payload, $validSignature));
        $this->assertFalse($daemonClient->verifyWebhookSignature($payload, 'invalid-signature'));
    }

    public function test_webhook_signature_verification_rejects_empty_secret(): void
    {
        Config::set('daemon.webhook_secret', '');

        $daemonClient = app(DaemonClient::class);

        $payload = json_encode(['taskId' => 'task-1', 'status' => 'completed']);
        $signature = hash_hmac('sha256', $payload, '');

        $this->assertFalse($daemonClient->verifyWebhookSignature($payload, $signature));
    }

    public function test_job_completion_dispatches_handle_job_completion(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
            'output' => [
                'files' => ['name' => 'output.mp4', 'size' => 1024],
                'projectId' => 'daemon-project-123',
            ],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertOk();
        Bus::assertDispatched(HandleJobCompletion::class, function ($job) {
            return $job->renderJob->uuid === 'test-job-uuid-1234';
        });
    }

    public function test_job_failure_dispatches_handle_job_failure(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'failed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
            'error_message' => 'Provider error',
            'error_code' => 'AllocationQuota.FreeTierOnly',
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertOk();
        Bus::assertDispatched(HandleJobFailure::class, function ($job) {
            return $job->renderJob->uuid === 'test-job-uuid-1234';
        });
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => 'invalid-signature',
        ]);

        $response->assertStatus(401);
        Bus::assertNotDispatched(HandleJobCompletion::class);
    }

    public function test_webhook_rejects_missing_required_fields(): void
    {
        $payload = ['taskId' => 'task-1'];
        $signature = hash_hmac('sha256', json_encode($payload), 'test-webhook-secret');

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => $signature,
        ]);

        $response->assertStatus(422);
    }

    public function test_webhook_ignores_terminal_jobs(): void
    {
        $this->job->update(['status' => 'completed']);

        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertOk();
        Bus::assertNotDispatched(HandleJobCompletion::class);
    }

    public function test_webhook_records_progress_for_running_status(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'running',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
            'progress' => ['message' => 'Processing frame 1/10'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertOk();
        $this->job->refresh();
        $this->assertEquals('Processing frame 1/10', $this->job->parameters['last_progress']);
    }

    public function test_webhook_returns_404_for_unknown_job(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'nonexistent-uuid'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertStatus(404);
    }

    public function test_webhook_endpoint_exists_and_accepts_post(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertOk();
    }

    public function test_webhook_rejects_unknown_status_with_422(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'unknown_status',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload, [
            'X-Signature' => hash_hmac('sha256', json_encode($payload), 'test-webhook-secret'),
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['error' => 'Unknown status: unknown_status']);
    }

    public function test_webhook_handles_missing_signature_header(): void
    {
        $payload = [
            'taskId' => 'daemon-task-123',
            'status' => 'completed',
            'metadata' => ['render_job_uuid' => 'test-job-uuid-1234'],
        ];

        $response = $this->postJson('/api/daemon/webhook', $payload);

        $response->assertStatus(401);
        Bus::assertNotDispatched(HandleJobCompletion::class);
    }
}
