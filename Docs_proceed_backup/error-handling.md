# Error Handling

> How errors are caught, classified, and returned. Define this once so every endpoint
> behaves consistently — and users never see a raw stack trace.

## Principles
- Fail loud in dev, fail safe in prod (no stack traces to users).
- Every error has: a **type**, an **HTTP status**, a **safe user message**, and a **log**.
- Never swallow errors silently.

## Custom error classes
```
class AppError extends Error {
  constructor(message, { status = 500, code = 'INTERNAL', expose = false } = {}) {
    super(message);
    this.status = status;   // HTTP status
    this.code = code;       // machine-readable code
    this.expose = expose;   // safe to show the user?
  }
}

class ValidationError extends AppError { /* 400 VALIDATION, expose:true */ }
class AuthError       extends AppError { /* 401 UNAUTHENTICATED, expose:true */ }
class ForbiddenError  extends AppError { /* 403 FORBIDDEN, expose:true */ }
class NotFoundError   extends AppError { /* 404 NOT_FOUND, expose:true */ }
class RateLimitError  extends AppError { /* 429 RATE_LIMITED, expose:true */ }
```
> Adapt to your language (Python: subclass `Exception`, etc.).

## HTTP status codes (use these consistently)
| Status | When |
|--------|------|
| 200 / 201 | Success / created |
| 400 | Bad input / validation failed |
| 401 | Not logged in |
| 403 | Logged in but not allowed |
| 404 | Resource not found |
| 409 | Conflict (duplicate, version clash) |
| 422 | Semantically invalid |
| 429 | Rate limited |
| 500 | Unexpected server error |

## Standard response shape
Success:
```json
{ "ok": true, "data": { } }
```
Error:
```json
{ "ok": false, "error": { "code": "VALIDATION", "message": "Email is required" } }
```
- `message` is only the **safe** message (`expose: true`). For 500s, return a generic
  "Something went wrong" and log the real error server-side with a request id.

## Central error handler
- One middleware / handler catches everything, maps to the shape above, sets the status.
- Unhandled errors → 500 + generic message + full log (never leak internals).

## Logging
- Log level: <error / warn / info>
- Include: timestamp, request id, user id (if any), route, error code.
- Ship logs to: <console / Sentry / Logtail / ...>

## Client-side
- Show friendly messages per `error.code`.
- Handle network failure + timeout with a retry / toast.
