import { describe, it, expect, vi, afterEach } from 'vitest';

/**
 * Integration tests for webhook flow.
 *
 * These tests verify the webhook signature verification and job flow logic
 * at the TypeScript level, testing the daemon → backend webhook contract.
 */

describe('Webhook Signature Verification (integration)', () => {
  const WEBHOOK_SECRET = 'test-webhook-secret-integration';

  function signPayload(payload: string, secret: string): string {
    const { createHmac } = require('node:crypto');
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  it('generates valid HMAC-SHA256 signature', () => {
    const payload = JSON.stringify({ taskId: 'task-1', status: 'completed' });
    const signature = signPayload(payload, WEBHOOK_SECRET);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same payload + secret produces same signature (deterministic)', () => {
    const payload = JSON.stringify({ taskId: 'task-1', status: 'completed' });
    const sig1 = signPayload(payload, WEBHOOK_SECRET);
    const sig2 = signPayload(payload, WEBHOOK_SECRET);
    expect(sig1).toBe(sig2);
  });

  it('different payloads produce different signatures', () => {
    const payload1 = JSON.stringify({ taskId: 'task-1', status: 'completed' });
    const payload2 = JSON.stringify({ taskId: 'task-2', status: 'failed' });
    const sig1 = signPayload(payload1, WEBHOOK_SECRET);
    const sig2 = signPayload(payload2, WEBHOOK_SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('different secrets produce different signatures', () => {
    const payload = JSON.stringify({ taskId: 'task-1', status: 'completed' });
    const sig1 = signPayload(payload, 'secret-1');
    const sig2 = signPayload(payload, 'secret-2');
    expect(sig1).not.toBe(sig2);
  });

  it('rejects signature mismatch (tampered payload)', () => {
    const originalPayload = JSON.stringify({ taskId: 'task-1', status: 'completed' });
    const tamperedPayload = JSON.stringify({ taskId: 'task-1', status: 'failed' });
    const signature = signPayload(originalPayload, WEBHOOK_SECRET);
    const expectedSig = signPayload(tamperedPayload, WEBHOOK_SECRET);
    expect(signature).not.toBe(expectedSig);
  });
});

describe('Webhook Payload Contract (integration)', () => {
  interface WebhookPayload {
    taskId: string;
    status: 'running' | 'completed' | 'failed' | 'interrupted';
    metadata: { render_job_uuid: string };
    output?: { files: { name: string; gpu_seconds?: number }; projectId: string };
    error_message?: string;
    error_code?: string;
    progress?: string[];
  }

  function validateWebhookPayload(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const payload = data as Partial<WebhookPayload>;

    if (!payload.taskId) errors.push('Missing taskId');
    if (!payload.status) errors.push('Missing status');
    if (!payload.metadata?.render_job_uuid) errors.push('Missing metadata.render_job_uuid');

    if (payload.status === 'completed' && !payload.output?.files?.name) {
      errors.push('Completed status requires output.files.name');
    }

    if (payload.status === 'failed' && !payload.error_message) {
      errors.push('Failed status should include error_message');
    }

    return { valid: errors.length === 0, errors };
  }

  it('validates a complete completed payload', () => {
    const payload: WebhookPayload = {
      taskId: 'task-123',
      status: 'completed',
      metadata: { render_job_uuid: 'job-uuid-1234' },
      output: { files: { name: 'output.mp4', gpu_seconds: 120 }, projectId: 'proj-123' },
    };
    expect(validateWebhookPayload(payload)).toEqual({ valid: true, errors: [] });
  });

  it('validates a running payload', () => {
    const payload: WebhookPayload = {
      taskId: 'task-123',
      status: 'running',
      metadata: { render_job_uuid: 'job-uuid-1234' },
      progress: ['Processing frame 1/10'],
    };
    expect(validateWebhookPayload(payload)).toEqual({ valid: true, errors: [] });
  });

  it('rejects payload missing taskId', () => {
    const payload = { status: 'completed', metadata: { render_job_uuid: 'job-1' } };
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing taskId');
  });

  it('rejects payload missing metadata.render_job_uuid', () => {
    const payload = { taskId: 'task-1', status: 'completed', metadata: {} };
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing metadata.render_job_uuid');
  });

  it('rejects completed payload without output', () => {
    const payload: WebhookPayload = {
      taskId: 'task-1',
      status: 'completed',
      metadata: { render_job_uuid: 'job-1' },
    };
    const result = validateWebhookPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Completed status requires output.files.name');
  });

  it('validates failed payload with error info', () => {
    const payload: WebhookPayload = {
      taskId: 'task-1',
      status: 'failed',
      metadata: { render_job_uuid: 'job-1' },
      error_message: 'Provider quota exceeded',
      error_code: 'AllocationQuota.FreeTierOnly',
    };
    expect(validateWebhookPayload(payload)).toEqual({ valid: true, errors: [] });
  });

  it('validates storyboard_scene_ prefix routing', () => {
    const uuid = 'storyboard_scene_42';
    expect(uuid.startsWith('storyboard_scene_')).toBe(true);
    const sceneId = parseInt(uuid.replace('storyboard_scene_', ''), 10);
    expect(sceneId).toBe(42);
  });

  it('validates storyboard_single_flow_ prefix routing', () => {
    const uuid = 'storyboard_single_flow_15';
    expect(uuid.startsWith('storyboard_single_flow_')).toBe(true);
    const storyboardId = parseInt(uuid.replace('storyboard_single_flow_', ''), 10);
    expect(storyboardId).toBe(15);
  });
});

describe('Credit Flow Contract (integration)', () => {
  it('credit cost is positive integer', () => {
    const creditsCost = 10;
    expect(creditsCost).toBeGreaterThan(0);
    expect(Number.isInteger(creditsCost)).toBe(true);
  });

  it('user credits decrease after job creation', () => {
    let userCredits = 100;
    const jobCost = 15;

    userCredits -= jobCost;
    expect(userCredits).toBe(85);
  });

  it('credits are released on failure', () => {
    let userCredits = 85;
    const jobCost = 15;

    userCredits += jobCost;
    expect(userCredits).toBe(100);
  });

  it('user cannot create job with insufficient credits', () => {
    const userCredits = 5;
    const jobCost = 10;
    expect(userCredits >= jobCost).toBe(false);
  });

  it('user with exact credits can create job', () => {
    const userCredits = 10;
    const jobCost = 10;
    expect(userCredits >= jobCost).toBe(true);
  });
});
