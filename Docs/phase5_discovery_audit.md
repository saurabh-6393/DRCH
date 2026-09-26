# Phase 5 — Discovery & Current-State Audit

**Date:** 2026-09-25
**Status:** DISCOVERY ONLY — Implementation NOT started
**Prerequisite:** Phases 1–4 FROZEN

---

## 1. Current Phase 5 Readiness Summary

The Phase 1–4 implementation provides a functional modular-monolith MVP with authentication, incident reporting, AI verification, human review, shelters, alerts, resources, notifications, and real-time Socket.IO. The application passes 22/22 backend tests (Phase 4 Vitest) and 14/14 frontend tests.

Phase 5 targets are **hardening, audit trail, security, E2E testing, and deployment readiness** — NOT new features.

### Key Gaps Identified

| Area | Current State | Phase 5 Required |
|------|--------------|-------------------|
| Audit logging | **NOT IMPLEMENTED** — no `audit_logs` table or module exists | Required by contract |
| Rate limiting | **NOT IMPLEMENTED** — no `express-rate-limit` dependency or middleware | Required by security.md |
| Web Push VAPID | **Partially implemented** — dev fallback keys, no production VAPID config | Hardening needed |
| Playwright E2E | **NOT IMPLEMENTED** — no Playwright dependency or tests | Required by phases.md |
| Production build | Backend `tsc` works; Frontend `vite build` works | Deployment config gaps |
| Graceful shutdown | **NOT IMPLEMENTED** — no SIGTERM/SIGINT handlers | Required for production |
| Health endpoint | Exists at `/health` (not `/api/v1/health`) | Sufficient |

---

## 2. Existing Implementation Inventory

### Backend Modules (8 modules)
| Module | Location | Status |
|--------|----------|--------|
| Auth | `modules/auth/` | ✅ Complete (register, login, refresh, logout, me) |
| Incidents | `modules/incidents/` | ✅ Complete (create, my-reports, public) |
| AI | `modules/ai/` | ✅ Complete (Gemini integration + fallback) |
| Verifications | `modules/verifications/` | ✅ Complete (queue, review, verify) |
| Shelters | `modules/shelters/` | ✅ Complete (proximity search, capacity) |
| Alerts | `modules/alerts/` | ✅ Complete (create, list active, cancel) |
| Resources | `modules/resources/` | ✅ Complete (create, list, allocate, delete allocation) |
| Notifications | `modules/notifications/` | ✅ Complete (subscribe, location update, list, mark read, VAPID) |

### Middleware (5 files)
| Middleware | File | Status |
|-----------|------|--------|
| Authentication | `authenticate.ts` | ✅ JWT cookie verification |
| Authorization | `authorize.ts` | ✅ Role-based access control |
| Error handler | `errorHandler.ts` | ✅ Centralized, strips stack in production |
| Request ID | `requestId.ts` | ✅ UUID per request for tracing |
| Upload | `upload.ts` | ✅ Multer + magic bytes + file validation |

### Shared Modules
| Module | File | Status |
|--------|------|--------|
| Tokens | `shared/tokens.ts` | ✅ JWT generation, verification, SHA-256 hashing, cookie helpers |
| Errors | `shared/errors.ts` | ✅ AppError class with typed error codes |
| Response | `shared/response.ts` | ✅ Standard `{ok, data}` / `{ok, error}` format |
| Logger | `shared/logger.ts` | ✅ Structured JSON logging, dev/prod modes |

### Services
| Service | File | Status |
|---------|------|--------|
| Storage | `services/storage.service.ts` | ✅ S3/MinIO upload/delete |

### Database
| Item | Status |
|------|--------|
| Schema | ✅ 16 tables (init.ts with IF NOT EXISTS) |
| PostGIS | ✅ Enabled, spatial indexes |
| Connection pool | ✅ pg Pool (min:2, max:10) |
| Parameterized queries | ✅ All queries use `$1` parameters |
| Migrations | ❌ No migration framework (init.ts only) |

### Frontend (React 19 + Vite + TailwindCSS v4)
| Feature | Status |
|---------|--------|
| Auth context | ✅ AuthContext.tsx |
| Protected routes | ✅ ProtectedRoute.tsx |
| Login/Register | ✅ LoginPage, RegisterPage |
| Incident form | ✅ IncidentReportForm |
| My Reports | ✅ MyReportsList |
| Public Map | ✅ PublicMapPage + MapboxMap |
| Verification queue | ✅ VerificationQueue + ReviewModal |
| Shelters | ✅ ShelterSearch |
| Dashboard | ✅ DashboardPage |
| API client | ✅ Axios with `withCredentials: true` |

---

## 3. Audit Logging Gap Analysis

### Current State
- **No `audit_logs` table exists** in the database schema (`init.ts`)
- **No audit module/service exists** in the backend source
- The architecture doc (§13) lists `/api/v1/audit` as a planned route — **NOT IMPLEMENTED**
- The security doc (§7) explicitly requires: *"Critical actions write audit metadata logs to the `audit_logs` table"*

### Actions That MUST Be Audited (per security.md & phases.md)
| Action | Current Module | Current Audit | Gap |
|--------|---------------|---------------|-----|
| Role modification | Not implemented (no role change endpoint) | None | ⚠️ Role modification endpoint doesn't exist yet |
| Final verification decision (VERIFIED/REJECTED) | `verifications.service.ts` | Logger only | **GAP** — needs audit_logs record |
| Alert creation | `alerts.service.ts` | Logger only | **GAP** — needs audit_logs record |
| Alert cancellation | `alerts.service.ts` | Logger only | **GAP** — needs audit_logs record |
| Shelter capacity change | `shelters` module | Logger only | **GAP** — needs audit_logs record |
| User registration | `auth.service.ts` | Logger only | **GAP** — needs audit_logs record |
| Login (success/failure) | `auth.service.ts` | None | **GAP** — needs audit_logs record |
| Session revocation / logout | `auth.service.ts` | None | **GAP** — needs audit_logs record |
| Resource allocation | `resources.service.ts` | Logger only | **GAP** — needs audit_logs record |
| Resource allocation deletion | `resources.service.ts` | Logger only | **GAP** — needs audit_logs record |

### Proposed Minimum `audit_logs` Schema
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(100) NOT NULL,        -- e.g. 'INCIDENT_VERIFIED', 'ALERT_CREATED'
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_type VARCHAR(50) NOT NULL,    -- e.g. 'INCIDENT', 'ALERT', 'USER'
  target_id UUID NOT NULL,
  metadata JSONB,                       -- action-specific context (severity, old/new values)
  ip_address INET,                      -- client IP for security auditing
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at);
```

### Data That MUST NEVER Be Stored in Audit Logs
- Passwords / password hashes
- Access tokens / refresh tokens
- JWT secrets
- VAPID private keys
- S3/MinIO credentials
- Gemini API keys
- Session token hashes
- Any raw authentication secret

### Integration Points (add audit calls WITHOUT modifying frozen logic)
1. `verifications.service.ts` → after `submitVerify()` commits
2. `alerts.service.ts` → after `createAlert()` and `cancelAlert()` commit
3. `resources.service.ts` → after `allocateResource()` and `deleteAllocation()` commit
4. `auth.service.ts` → after `registerUser()`, `loginUser()`, `logoutSession()` commit
5. New audit routes: `GET /api/v1/audit` (ADMIN/AUTHORITY only)

### Retention / Indexing
- No specific retention period is documented — **OPEN DECISION**
- Indexed by `actor_id`, `target_type + target_id`, and `created_at`

---

## 4. Security Gap Analysis

### Already Implemented ✅
| Security Feature | Implementation | Location |
|-----------------|----------------|----------|
| Helmet | `app.use(helmet())` | `app.ts:24` |
| CORS | Origin restricted to `env.FRONTEND_URL`, credentials: true | `app.ts:27-32` |
| HttpOnly cookies | `httpOnly: true` | `tokens.ts:57` |
| Secure cookies (production) | `secure: env.NODE_ENV === 'production'` | `tokens.ts:65` |
| SameSite=Strict | `sameSite: 'strict'` | `tokens.ts:58` |
| Cookie domain config | `env.COOKIE_DOMAIN` optional | `tokens.ts:67` |
| Refresh token hashing | SHA-256 hash stored, never raw | `tokens.ts:48-50`, `auth.service.ts:66,128,157` |
| Session revocation | `revoked_at` timestamp on logout | `auth.service.ts:181-184,229-235` |
| Token rotation | Old session revoked, new session created | `auth.service.ts:148-222` |
| Parameterized SQL | All queries use `$1` params | All service files |
| Upload validation | Size (5MB), extension whitelist, magic bytes | `upload.ts` |
| Production error stripping | Stack traces removed in production | `errorHandler.ts:18-21,30` |
| Structured error responses | Standard `{ok, error: {code, message, details}}` | `errorHandler.ts`, `response.ts` |
| Request ID tracing | UUID per request | `requestId.ts` |
| Gemini key server-side only | `GEMINI_API_KEY` in backend env only | `config/env.ts` |
| S3 credentials server-side only | Not referenced in frontend | Verified via grep |
| Socket.IO dispatcher auth | JWT cookie verified in middleware | `socket.server.ts:91-112` |
| Body size limit | `express.json({ limit: '1mb' })` | `app.ts:35` |

### Security GAPS ❌
| Gap | Severity | Details |
|-----|----------|---------|
| **No rate limiting** | **HIGH** | No `express-rate-limit` dependency. Login, signup, and all endpoints are unprotected. | 
| **Socket.IO CORS wildcard** | **MEDIUM** | `socket.server.ts:31` uses `origin: true` (allows all origins). Should match `env.FRONTEND_URL` in production. |
| **VAPID keys hardcoded fallback** | **MEDIUM** | `notifications.service.ts:12-13` has hardcoded mock VAPID keys. Production requires real VAPID env vars. |
| **S3 credential defaults** | **LOW** | `env.ts:22-23` defaults `S3_ACCESS_KEY` to `minioadmin` and `S3_SECRET_KEY` to `change_me_locally`. Production must require these. |
| **No CSRF protection beyond SameSite** | **LOW** | SameSite=Strict provides good protection. No additional CSRF token needed for this architecture. |
| **No graceful shutdown** | **MEDIUM** | `index.ts` has no SIGTERM/SIGINT handlers. Open connections and DB pool won't drain cleanly. |
| **No 404 catch-all JSON handler** | **LOW** | Unmatched routes return Express HTML 404 instead of JSON. |
| **JWT_ACCESS_SECRET min length** | **LOW** | Zod validates `min(16)` which is acceptable but production should use longer secrets. |
| **No session cleanup** | **LOW** | Expired/revoked sessions accumulate indefinitely. No scheduled cleanup. |

---

## 5. Rate Limiting Gap Analysis

### Current State
- **Zero rate limiting exists** — no middleware, no dependency
- `express-rate-limit` is NOT in `package.json`
- The `RATE_LIMITED` error code (429) is already defined in `errors.ts` but never used

### Documented Defaults (from security.md §5)
| Route Group | Limit | Window |
|-------------|-------|--------|
| Login/Signup | 5 requests | 15 minutes |
| Incident Submission | 10 requests | 15 minutes |
| General public endpoints | 100 requests | 15 minutes |

### Proposed Rate Limit Groups
| Group | Routes | Key | Limit |
|-------|--------|-----|-------|
| `auth` | `POST /api/v1/auth/login`, `POST /api/v1/auth/register` | IP address | 5 / 15min |
| `incident-submit` | `POST /api/v1/incidents` | User ID (authenticated) | 10 / 15min |
| `general` | All other `/api/v1/*` routes | IP address | 100 / 15min |
| `refresh` | `POST /api/v1/auth/refresh` | IP address | 10 / 15min |

### Middleware Placement
```
app.ts:
  app.use(helmet());
  app.use(cors(...));
  → INSERT: app.use('/api/v1/auth/login', authRateLimiter);
  → INSERT: app.use('/api/v1/auth/register', authRateLimiter);
  → INSERT: app.use('/api/v1/', generalRateLimiter);
  app.use(express.json(...));
  ...
  → Route-specific limiters applied in route files for incident submission
```

### Response Format
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please try again later.",
    "details": []
  }
}
```

### Proxy Considerations
- **OPEN DECISION**: Whether `trust proxy` should be enabled for `X-Forwarded-For` header parsing
- Required if deploying behind nginx/load balancer

### Socket.IO Rate Limiting
- Socket.IO connections are authenticated but have no message rate limiting
- Consider throttling `set_location` events to prevent GPS spam
- Not critical for MVP but recommended

---

## 6. Web Push Hardening Gap Analysis

### Current State (Phase 4 Implementation)
| Feature | Status |
|---------|--------|
| Push subscription registration | ✅ `subscribePush()` |
| Location updates for targeting | ✅ `updatePushLocation()` |
| Geospatial alert targeting | ✅ `ST_Intersects` with GeoJSON |
| 7-day location freshness TTL | ✅ `AND updated_at >= NOW() - INTERVAL '7 days'` |
| Notification history persistence | ✅ `notifications` table |
| Read state tracking | ✅ `markNotificationAsRead()` |
| Expired subscription cleanup | ✅ Deletes 410/404 subscriptions |
| VAPID configuration | ⚠️ Dev fallback keys only |
| `getVapidPublicKey()` endpoint | ✅ Exists |

### Hardening Gaps
| Gap | Severity | Details |
|-----|----------|---------|
| **VAPID keys are hardcoded fallback** | **HIGH** | `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` use mock values. Must be real generated keys in production. Add to `env.ts` schema with production validation. |
| **No subscription validation** | **MEDIUM** | `subscribePush()` does not validate endpoint URL format or keys length. Malformed subscriptions could cause push failures. |
| **No periodic expired subscription cleanup** | **LOW** | Subscriptions with `updated_at > 7 days` are never proactively deleted. Only cleaned on 410/404 push failure. |
| **No HTTPS enforcement documentation** | **MEDIUM** | Web Push API requires HTTPS in production. No documentation or env check exists. |
| **No service worker** | **HIGH** | Frontend has no `service-worker.js` for receiving push notifications. Without it, Web Push is backend-only. |
| **No frontend push permission UI** | **MEDIUM** | No UI flow for requesting browser notification permission via `Notification.requestPermission()`. |
| **Notification payload size** | **LOW** | No check that payload stays under browser push limits (~4KB). |
| **Geolocation privacy notice** | **LOW** | No documented user consent flow for location tracking. |

### VAPID Production Requirements
```env
VAPID_PUBLIC_KEY=<generated-65-byte-urlsafe-base64>
VAPID_PRIVATE_KEY=<generated-32-byte-urlsafe-base64>
VAPID_SUBJECT=mailto:admin@your-domain.com
```

Generate with: `npx web-push generate-vapid-keys`

---

## 7. Playwright E2E Plan

### Current State
- **No Playwright dependency** in either `package.json`
- **No E2E test directory** or configuration
- Frontend tests use Vitest + jsdom (unit/component level only)

### Minimum E2E Journeys

#### Journey 1: Citizen Registration & Login
| Aspect | Detail |
|--------|--------|
| Starting state | Clean browser, no session |
| Seeded data | Database initialized with roles |
| User role | CITIZEN (auto-assigned) |
| Steps | Register → Verify redirect → Login → Verify dashboard |
| External deps | None |
| Mock required | None |

#### Journey 2: Citizen Incident Submission
| Aspect | Detail |
|--------|--------|
| Starting state | Logged in as CITIZEN |
| Seeded data | Roles, test user |
| Steps | Navigate to report form → Fill fields → Attach image → Submit → Verify my-reports |
| External deps | Gemini API, S3/MinIO |
| Mock required | **Gemini API** (intercept HTTP or mock service) |
| S3/MinIO | Real MinIO container required for upload |

#### Journey 3: AI Verification / Fallback
| Aspect | Detail |
|--------|--------|
| Starting state | Incident submitted |
| Steps | Verify AI verification record exists → Verify queue shows incident |
| Mock required | **Gemini API** mock for both success and failure paths |

#### Journey 4: Volunteer/NGO Review
| Aspect | Detail |
|--------|--------|
| Starting state | Incident in UNDER_REVIEW |
| Seeded data | Volunteer user with role |
| Steps | Login as VOLUNTEER → View queue → Submit review recommendation |
| Mock required | None |

#### Journey 5: Authority Verification
| Aspect | Detail |
|--------|--------|
| Starting state | Incident has at least one review |
| Seeded data | Authority user with role |
| Steps | Login as AUTHORITY → View queue → Verify incident → Set severity |
| Mock required | None |

#### Journey 6: Verified Incident Visibility
| Aspect | Detail |
|--------|--------|
| Starting state | Incident VERIFIED |
| Steps | Visit public map → Verify incident appears → Verify coordinates are rounded |
| Mock required | Mapbox token (real or mock) |

#### Journey 7: Authority Alert Creation
| Aspect | Detail |
|--------|--------|
| Starting state | Verified incident exists |
| Seeded data | Authority user |
| Steps | Login as AUTHORITY → Create alert with polygon → Verify alert appears |
| External deps | PostGIS for polygon validation |
| Mock required | None |

#### Journey 8: Alert Delivery / Notification
| Aspect | Detail |
|--------|--------|
| Starting state | Alert created, push subscription registered |
| Steps | Verify notification history record → Verify notification list endpoint |
| Mock required | **Web Push** (browser push cannot be tested without service worker) |
| Note | Socket.IO alert broadcast testable via Playwright WebSocket interception |

#### Journey 9: Resource Creation & Allocation
| Aspect | Detail |
|--------|--------|
| Starting state | Organization exists |
| Seeded data | NGO user, organization |
| Steps | Create resource → Allocate to incident → Verify quantity calculation |
| Mock required | None |

#### Journey 10: Shelter Flow
| Aspect | Detail |
|--------|--------|
| Starting state | Shelters seeded |
| Steps | Search shelters by location → Verify proximity results |
| Mock required | Mapbox routing (optional) |

#### Journey 11: Logout / Session
| Aspect | Detail |
|--------|--------|
| Starting state | Logged in |
| Steps | Logout → Verify cookies cleared → Verify protected route redirects to login |
| Mock required | None |

### E2E Infrastructure Requirements
| Dependency | Requirement |
|------------|-------------|
| PostgreSQL/PostGIS | Docker container required |
| MinIO | Docker container required |
| Gemini API | Mock via Playwright route interception or env-controlled mock service |
| Mapbox | Real token or mock tiles |
| Web Push | Backend-only verification (no browser push testing) |
| Socket.IO | Playwright WebSocket API for interception |

---

## 8. Production Deployment Gap Analysis

### Frontend Production Build
| Item | Status |
|------|--------|
| `vite build` | ✅ Works |
| `VITE_API_URL` env var | ⚠️ Defaults to `http://localhost:5000` — needs production URL |
| `VITE_MAPBOX_TOKEN` | ⚠️ Not verified in env schema |
| Static asset serving | ❌ No static file serving from backend or CDN config |

### Backend Production Build
| Item | Status |
|------|--------|
| `tsc` compilation | ✅ Works |
| `node dist/index.js` | ✅ Start script exists |
| Process manager | ❌ No PM2/systemd/container entrypoint |
| Graceful shutdown | ❌ No SIGTERM handler |
| Health/readiness check | ✅ `/health` endpoint exists |
| Logging to stdout/file | ✅ Structured JSON in production |

### Environment Variables
| Variable | Current Default | Production Requirement |
|----------|----------------|----------------------|
| `NODE_ENV` | `development` | Must be `production` |
| `DATABASE_URL` | Hardcoded local | Must use production credentials |
| `JWT_ACCESS_SECRET` | `dev_access_secret_...` (37 chars) | Must be strong random secret (≥64 chars) |
| `JWT_REFRESH_SECRET` | `dev_refresh_secret_...` (39 chars) | Must be strong random secret (≥64 chars) |
| `COOKIE_DOMAIN` | Empty | Must be set for production domain |
| `FRONTEND_URL` | `http://localhost:5173` | Must be production HTTPS URL |
| `GEMINI_API_KEY` | Empty | Required for AI features |
| `S3_ENDPOINT` | `http://127.0.0.1:9000` | Production S3/MinIO URL |
| `S3_ACCESS_KEY` | `minioadmin` | Production credentials |
| `S3_SECRET_KEY` | `change_me_locally` | Production credentials |
| `VAPID_PUBLIC_KEY` | Mock fallback | Must be real generated key |
| `VAPID_PRIVATE_KEY` | Mock fallback | Must be real generated key |
| `VAPID_SUBJECT` | `mailto:admin@drch.gov` | Must be real contact |

### Docker Configuration
| Item | Status |
|------|--------|
| `docker-compose.yml` | ✅ PostgreSQL/PostGIS + MinIO |
| Backend Dockerfile | ❌ Does not exist |
| Frontend Dockerfile | ❌ Does not exist |
| Production compose | ❌ Does not exist |
| Volume backups | ❌ No backup strategy documented |

### Database
| Item | Status |
|------|--------|
| Schema creation | ✅ `npm run db:init` with IF NOT EXISTS |
| Migrations | ❌ No migration framework |
| Backup/restore | ❌ No documentation |
| Connection pooling | ✅ min:2, max:10 |
| SSL connections | ❌ Not configured |

---

## 9. Performance / Load / Security Validation Plan

### Authentication Endpoints
| Test | Target | Metric |
|------|--------|--------|
| Login throughput | `POST /api/v1/auth/login` | Sustained 50 req/s without degradation |
| Registration throughput | `POST /api/v1/auth/register` | bcrypt hash time ≤ 500ms at 12 rounds |
| Token refresh | `POST /api/v1/auth/refresh` | ≤ 100ms p95 response time |

### Incident Submission
| Test | Target | Metric |
|------|--------|--------|
| Form submission with 5MB image | `POST /api/v1/incidents` | ≤ 3s total (upload + validation + AI + DB) |
| Concurrent submissions | 10 simultaneous | No 500 errors, all validated |

### Public Endpoints
| Test | Target | Metric |
|------|--------|--------|
| Public incidents list | `GET /api/v1/incidents/public` | ≤ 200ms with 1000 incidents |
| Active alerts list | `GET /api/v1/alerts` | ≤ 100ms |

### Shelter Proximity
| Test | Target | Metric |
|------|--------|--------|
| PostGIS proximity query | `GET /api/v1/shelters?lat=X&lng=Y&radius=Z` | ≤ 50ms with 100 shelters |

### Resource Allocation Concurrency
| Test | Target | Metric |
|------|--------|--------|
| Concurrent allocations | 5 simultaneous on same resource | No over-allocation (FOR UPDATE lock verified) |

### Socket.IO
| Test | Target | Metric |
|------|--------|--------|
| Connection count | 100 concurrent socket clients | Stable connections, no drops |
| Alert broadcast latency | 1 alert → 100 clients | ≤ 500ms delivery |

### Security Validation
| Test | Metric |
|------|--------|
| Helmet headers present | CSP, X-Frame-Options, HSTS verified |
| CORS rejects wildcard | `Origin: https://evil.com` → rejected |
| SQL injection | Parameterized queries confirmed (already verified) |
| XSS via incident fields | Input sanitized, no script execution |
| Rate limiting active | 429 returned after threshold exceeded |

---

## 10. Documentation Gaps

| Document | Status | Phase 5 Action |
|----------|--------|---------------|
| `architecture.md` | ✅ Exists, mostly current | Update: add audit module, rate limiting, deployment section |
| `database.md` | ✅ Exists | Update: add `audit_logs` table |
| `security.md` | ✅ Exists | Update: mark implemented items, add rate limit config |
| `error-handling.md` | ✅ Exists, current | No changes needed |
| `phases.md` | ✅ Exists | Update: mark Phase 5 items as complete |
| `.env.example` | ✅ Exists (root + backend) | Update: add VAPID keys, document all production vars |
| API documentation | ❌ No OpenAPI/Swagger | Create: route documentation with request/response schemas |
| Local setup guide | ❌ No README.md | Create: step-by-step local dev setup |
| Production deployment | ❌ No deployment docs | Create: deployment checklist and runbook |
| Security checklist | ⚠️ Partial (security.md §9) | Complete: mark all items, add verification status |
| E2E testing guide | ❌ Does not exist | Create: Playwright setup and test run instructions |
| Backup/recovery | ❌ Does not exist | Create: PostgreSQL backup procedures |
| Operational runbook | ❌ Does not exist | Create: monitoring, alerting, incident response |

---

## 11. Proposed Phase 5 Implementation Order

| Step | Task | Dependencies | Estimated Complexity |
|------|------|-------------|---------------------|
| 1 | **Audit logging module** — schema, service, route, integration | None | Medium |
| 2 | **Rate limiting** — install `express-rate-limit`, configure groups | None | Low |
| 3 | **Security hardening** — Socket.IO CORS, graceful shutdown, 404 catch-all, session cleanup | None | Low |
| 4 | **Web Push hardening** — VAPID env validation, subscription validation | None | Low |
| 5 | **Production environment** — `.env.example` update, env validation tightening | Steps 1-4 | Low |
| 6 | **Playwright E2E setup** — install, configure, seed scripts | Steps 1-4 | Medium |
| 7 | **Playwright E2E tests** — all 11 journeys | Step 6 | High |
| 8 | **Production build** — Dockerfiles, production compose, static serving | Step 5 | Medium |
| 9 | **Documentation** — README, API docs, deployment guide, security checklist | Steps 1-8 | Medium |
| 10 | **Performance/load validation** — basic load tests, PostGIS benchmarks | Steps 1-8 | Low |

---

## 12. Dependencies

| Dependency | Purpose | Version Recommendation |
|-----------|---------|----------------------|
| `express-rate-limit` | Rate limiting middleware | Latest stable |
| `@playwright/test` | E2E browser automation | Latest stable |
| `web-push` | Already installed | Current version |
| No new database | — | PostgreSQL/PostGIS only |
| No Redis | — | In-memory rate limiting sufficient for MVP |
| No MongoDB | — | Explicitly out of scope |

---

## 13. Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Audit logging adds DB writes to every critical path | Minor latency increase | Async fire-and-forget audit writes (non-blocking) |
| Jest/Vitest mismatch blocks Phase 1-3 test execution | Cannot runtime-verify Phase 1-3 regression | Source-level verification + E2E coverage |
| Playwright tests depend on Docker infrastructure | CI/CD must have Docker | Document Docker requirement |
| VAPID key generation is a one-time manual step | If lost, all push subscriptions are invalidated | Document key management procedure |
| Rate limiting may affect legitimate users during disasters | Service denial during peak load | Configurable limits, higher authenticated thresholds |

---

## 14. Explicit OUT OF SCOPE

The following are **strictly excluded** from Phase 5:

- ❌ No new business features
- ❌ No new user roles
- ❌ No new database architecture
- ❌ No MongoDB
- ❌ No Redis
- ❌ No microservices
- ❌ No Kubernetes
- ❌ No redesign of Phase 1–4 APIs
- ❌ No AI feature expansion
- ❌ No new map functionality
- ❌ No new Socket.IO functionality beyond CORS hardening
- ❌ No resource/alert redesign
- ❌ No frontend feature expansion unrelated to hardening/E2E
- ❌ No migration framework introduction
- ❌ No new external services (Redis, RabbitMQ, etc.)
- ❌ No CI/CD pipeline creation (document only)
- ❌ No cloud provider infrastructure

---

## 15. Open Decisions — MUST Be Resolved Before Implementation

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | **Audit log retention period** | 30 days / 90 days / 1 year / indefinite | Affects cleanup job requirement and storage |
| 2 | **Rate limiter store** | In-memory (default) vs. external store | In-memory is sufficient for single-process MVP |
| 3 | **`trust proxy` setting** | Enable/disable | Required if deploying behind reverse proxy |
| 4 | **Service worker scope** | Frontend service worker for Web Push | Required for actual browser push notification delivery |
| 5 | **Playwright CI environment** | Local Docker only vs. GitHub Actions | Affects E2E test configuration |
| 6 | **Production deployment target** | Docker Compose / VPS / Cloud | Affects Dockerfile and deployment docs |
| 7 | **Frontend production URL** | `VITE_API_URL` and `COOKIE_DOMAIN` values | Must be decided before production build |
| 8 | **Session cleanup schedule** | Cron job / startup cleanup / manual | Affects expired session accumulation |
| 9 | **VAPID key management** | Environment variable / file / secrets manager | Must be decided before Web Push hardening |
| 10 | **API documentation format** | OpenAPI/Swagger auto-generation vs. manual markdown | Affects documentation effort |

---

## PHASE 5 DISCOVERY COMPLETE
## IMPLEMENTATION NOT STARTED
## AWAITING AUDIT REVIEW AND FINAL PHASE 5 CONTRACT
