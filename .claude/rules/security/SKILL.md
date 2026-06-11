---
name: security
description: Security rules and best practices
compatibility: opencode
metadata:
  scope: global
  type: rules
---

# Security Rules

## Authentication

### JWT (Laravel)
- Use `auth:api` guard for protected routes
- Refresh tokens before expiration (50min timer)
- Store tokens securely (httpOnly cookies preferred)

### API Keys (Daemon)
- Use HMAC-SHA256 for webhook signatures
- Verify signatures on all callbacks
- Rotate keys periodically

## Authorization

### Role-Based Access
- Admin roles for system management
- User roles for standard operations
- Check permissions in controllers and services

### Resource Ownership
- Verify user owns resource before modification
- Use policies for complex authorization

## Data Protection

### Secrets Management
- Never commit secrets to git
- Use `.env` for local development
- Use secrets manager in production

### Input Validation
- Validate all user input
- Sanitize output to prevent XSS
- Use parameterized queries to prevent SQL injection

## Network Security

### CORS
- Configure allowed origins explicitly
- Don't use `*` in production
- Include credentials only when necessary

### Rate Limiting
- Rate limit public APIs
- Use different limits for authenticated/unauthenticated
- Implement exponential backoff

## When to use this skill

Reference this when:
- Implementing auth flows
- Adding new API endpoints
- Reviewing security-sensitive code
