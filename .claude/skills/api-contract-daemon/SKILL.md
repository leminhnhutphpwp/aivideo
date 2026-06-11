---
name: api-contract-daemon
description: API contract between Laravel control plane and daemon media engine
---

## Goal
Keep contracts stable between Laravel control plane and daemon media engine (port 7456).

## Core Communication
- Laravel creates render jobs, stores them in DB, then delegates media generation to the daemon.
- Daemon processes media jobs and calls back to Laravel on completion/failure.

## Data Flow
1. User submits a request → Laravel creates a `RenderJob` (status: `queued`)
2. Laravel reserves credits, dispatches `HandleJobCompletion`/`HandleJobFailure` jobs
3. Daemon processes on port 7456 and sends webhook callback to Laravel
4. Laravel receives callback → updates `RenderJob` status → releases/reserves credits → sends email notifications

## Auth Rules
- Public user API uses JWT guard: `auth:api`.
- Daemon runs internally on port 7456, not publicly exposed.
- Callback webhooks include a shared secret for signature verification.

## Network Rules
- Public traffic enters Laravel only.
- Daemon is a separate process on the same machine, port 7456.
- No reverse proxy between Laravel and daemon.

## Non-Breaking Rules
1. Do not change response shapes for existing endpoints.
2. New fields must remain backward compatible.
3. Return clear status codes and error messages.

## When to use this skill

Reference this when:
- Modifying Laravel↔Daemon communication
- Adding new webhook callbacks
- Changing job lifecycle behavior
