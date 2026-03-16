---
name: security-guidance
description: Use when modifying server endpoints, handling user input, processing file uploads, managing secrets, configuring middleware, or adding new API routes - ensures changes follow secure coding practices for Express/TypeScript applications
---

# Security Guidance

## Overview

Security checklist and patterns for CookMate's Express + TypeScript server. Every change that touches request handling, file processing, AI orchestration, or WebSocket communication must be evaluated against these rules.

## When to Use

- Adding or modifying API endpoints
- Handling file uploads or user-provided content
- Working with environment variables or secrets
- Configuring middleware (CORS, rate limiting, helmet)
- Processing AI model output before returning to clients
- Modifying WebSocket server behavior
- Adding new dependencies

## Input Validation

**Treat ALL input as untrusted** - request bodies, params, query strings, headers, WebSocket messages, uploaded files.

### Required Checks

| Input Source | Validate |
|---|---|
| Request body | Schema validation (type, length, required fields) |
| URL params | Type coercion + allowlist for known values |
| Query strings | Sanitize before use; reject unexpected keys |
| File uploads | MIME type (server-side, not client-provided), file size, extension |
| WebSocket messages | JSON schema validation before processing |
| AI model output | Never trust as valid - validate structure before returning to client |

### Pattern: Validate Early, Fail Fast

```typescript
// Validate at the controller layer, before reaching services
function validateRecipeInput(body: unknown): RecipeInput {
  if (!body || typeof body !== 'object') {
    throw new AppError(400, 'INVALID_INPUT', 'Request body must be an object');
  }
  const { title, ingredients } = body as Record<string, unknown>;
  if (typeof title !== 'string' || title.length === 0 || title.length > 200) {
    throw new AppError(400, 'INVALID_TITLE', 'Title must be 1-200 characters');
  }
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    throw new AppError(400, 'INVALID_INGREDIENTS', 'At least one ingredient required');
  }
  return { title: title.trim(), ingredients };
}
```

## Secrets Management

**Rules:**
- All secrets via `process.env` - never hardcoded
- Never log secrets, API keys, or tokens
- Never include secrets in error responses
- `.env` must be in `.gitignore`; maintain `.env.example` with placeholder values
- Fail early on startup if required secrets are missing

### Scrubbing Pattern

```typescript
// Scrub secrets from error messages before logging or responding
function scrubSecrets(message: string): string {
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/g,     // OpenAI keys
    /AIza[a-zA-Z0-9_-]{35}/g,   // Google API keys
    /Bearer\s+[a-zA-Z0-9._-]+/g // Bearer tokens
  ];
  return patterns.reduce((msg, pat) => msg.replace(pat, '[REDACTED]'), message);
}
```

## File Upload Security

CookMate processes images and media. Every upload must be validated server-side.

**Checklist:**
- [ ] Validate MIME type server-side (do NOT trust `Content-Type` header)
- [ ] Enforce maximum file size (reject before fully buffering)
- [ ] Restrict allowed extensions to an explicit allowlist
- [ ] Sanitize filenames - strip path separators, special characters
- [ ] Store in temp directory with generated names, not user-provided names
- [ ] Clean up temp files after processing (use `finally` blocks)
- [ ] Never execute uploaded content

### Path Traversal Prevention

```typescript
import path from 'path';

function safeTempPath(uploadDir: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.mp4'];
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', `Extension ${ext} not allowed`);
  }
  const safeName = `${crypto.randomUUID()}${ext}`;
  const resolved = path.resolve(uploadDir, safeName);
  if (!resolved.startsWith(path.resolve(uploadDir))) {
    throw new AppError(400, 'INVALID_PATH', 'Path traversal detected');
  }
  return resolved;
}
```

## AI Agent Output

CookMate uses AI models for recipe generation and cooking guidance. Model output is **untrusted external input**.

**Rules:**
- Validate AI response structure matches expected schema before returning to client
- Sanitize text content - strip HTML/script tags if rendering in browser
- Set reasonable timeouts on AI API calls
- Never pass raw AI output to shell commands, database queries, or file paths
- Log AI errors without exposing model internals to the client

## WebSocket Security

**Rules:**
- Validate origin header on upgrade requests
- Authenticate connections before accepting
- Validate every incoming message against expected schema
- Rate limit messages per connection
- Set maximum payload size
- Handle connection cleanup (avoid resource leaks on disconnect)
- Never broadcast raw user input to other clients without sanitization

## HTTP Security Headers (Helmet)

CookMate uses `helmet` middleware. When modifying helmet configuration:

- Do not disable `Content-Security-Policy` in production
- Do not set `X-Frame-Options` to `ALLOWALL`
- Keep `X-Content-Type-Options: nosniff`
- Keep `Strict-Transport-Security` enabled for production

## CORS

- Explicit allowed origins only - never `origin: *` in production
- Use `CLIENT_URL` env var as the allowed origin
- Restrict allowed methods to what endpoints actually use
- Set `credentials: true` only if cookies/auth headers are needed

## Rate Limiting

- Apply rate limiting to all public-facing endpoints
- Stricter limits on expensive operations (AI calls, file processing)
- Return `429` with `Retry-After` header
- Rate limit WebSocket messages per connection, not just HTTP

## Dependency Security

- Avoid unnecessary packages - each dependency is attack surface
- Prefer mature, well-maintained libraries
- Remove unused dependencies
- Pin major versions in `package.json`
- Review what a package does before adding it

## Error Handling

- Never leak stack traces in production responses
- Never include internal paths, query details, or config in error messages
- Use structured error responses: `{ status: "error", error: { code, message } }`
- Log full error details server-side; return safe summary to client

## Common Mistakes

| Mistake | Fix |
|---|---|
| Trusting `Content-Type` header for uploads | Validate MIME via file magic bytes |
| Logging full request bodies | Scrub sensitive fields before logging |
| `origin: *` in CORS | Use explicit `CLIENT_URL` origin |
| Passing AI output to `eval`/`exec` | Validate and sanitize AI responses |
| Storing uploads with user-provided filename | Generate UUID filenames server-side |
| Missing `finally` for temp file cleanup | Always clean up in `finally` blocks |
| No message validation on WebSocket | Validate JSON schema on every message |
| Disabling security headers "for dev" | Use environment-specific config, not removal |

## Quick Reference

```
Input       → Validate schema, type, length, allowlist
Secrets     → env vars only, scrub from logs/errors, fail on missing
Files       → server-side MIME check, size limit, sanitize name, cleanup
AI output   → validate structure, sanitize text, timeout, never exec
WebSocket   → validate origin, auth, schema, rate limit, max payload
Headers     → helmet defaults, CSP on, HSTS on
CORS        → explicit origins, no wildcard in prod
Errors      → structured JSON, no stack traces, no internals
Deps        → minimal, mature, pinned, remove unused
```
