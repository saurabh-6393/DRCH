# Phase 5 Step 5 — Production Environment & Docker Artifacts

## 1. Planning Status

* **Status:** PLANNING COMPLETE — IMPLEMENTATION NOT STARTED
* **Step:** Phase 5 Step 5
* **Module:** Production Environment & Docker Artifacts
* **Authoritative Contract:** [/Docs/phase5_final_contract.md](file:///d:/DRCH/Docs/phase5_final_contract.md) (Version 2.0.0, FROZEN) §10, §17.4, §17.5, §17.9
* **Preceding Steps:**
  - Phase 1–4: FROZEN
  - Phase 5 Step 1 (Audit Logging): FROZEN
  - Phase 5 Step 2 (Rate Limiting): FROZEN
  - Phase 5 Step 3 (Security Hardening): FROZEN
  - Phase 5 Step 4 (Web Push Hardening): FROZEN
* **Implementation:** 0 source files modified; 0 Docker artifacts created; 0 dependencies installed.

---

## 2. Contract Reference

Authoritative specifications from Contract Version 2.0.0:

* **§10.1 Build Specifications:**
  - Backend: `npm run build` compiles clean TypeScript via `tsc` into `/backend/dist` with zero errors.
  - Frontend: `npm run build` bundles assets via `vite build` into `/frontend/dist` with zero errors.
* **§10.2 Production Containerization & Deployment Target:**
  - Single-server Docker deployment fronted by a reverse proxy.
  - No Kubernetes, microservices, cloud-provider-specific proprietary services, or managed orchestration infrastructure.
  - Multi-stage Dockerfiles for backend and frontend, and production Docker Compose configuration (`docker-compose.prod.yml`) shall be created during implementation.
  - Single production application domain. `COOKIE_DOMAIN` remains environment-configurable and defaults to unset unless the production reverse proxy topology explicitly requires it. No hardcoded domain names.
* **§10.3 Database Initialization Strategy:**
  - Continue using the existing idempotent `backend/src/db/init.ts` mechanism.
  - No third-party migration frameworks (Flyway, Liquibase, TypeORM, Prisma).
* **§10.4 Observability & Health Checking:**
  - Retain `GET /health` returning `{ ok: true, data: { status: 'healthy', timestamp } }`.
  - Structured JSON logs to `stdout` via `logger.ts`.
* **§17 Resolved Architectural Decisions:**
  - Decision #4: Single-server Docker deployment with reverse proxy in front.
  - Decision #5: Single production application domain; environment-configurable cookie domain.
  - Decision #7: VAPID keys generated once as deployment secrets.
  - Decision #9: Controlled `backend/src/db/init.ts` schema initialization.

---

## 3. Current Repository State

Inspection of the actual codebase establishes the following baseline:

1. **Backend Runtime:**
   - Framework: Express 5 (`^5.2.1`), Socket.IO (`^4.8.3`), TypeScript (`^5.8.2`), Node.js (>=20.0.0).
   - Entry point: [backend/src/index.ts](file:///d:/DRCH/backend/src/index.ts) compiles to `dist/index.js`.
   - Build script: `npm run build` runs `tsc`.
   - Start script: `npm run start` runs `node dist/index.js`.
   - Database init script: `npm run db:init` runs `tsx src/db/init.ts`.
   - Production port: `PORT` environment variable (defaults to 5000).
   - Health endpoint: `GET /health` mounted on root Express router in [backend/src/app.ts](file:///d:/DRCH/backend/src/app.ts#L45).
   - Shutdown: Process listens for `SIGTERM` and `SIGINT`, closes HTTP server, terminates Socket.IO, drains PostgreSQL pool, and halts session cleanup interval with a 10s safeguard in [backend/src/services/shutdown.service.ts](file:///d:/DRCH/backend/src/services/shutdown.service.ts).
2. **Frontend Build & Assets:**
   - Framework: React 19 (`^19.2.8`), React Router 7 (`^7.18.2`), Tailwind CSS 4, Vite 8 (`^8.2.0`).
   - Build script: `npm run build` runs `tsc && vite build`, outputting to `frontend/dist/`.
   - Static root assets: `public/sw.js` and `public/favicon.svg` copied directly to `frontend/dist/`.
   - API client: [frontend/src/api/client.ts](file:///d:/DRCH/frontend/src/api/client.ts) uses `VITE_API_URL` (defaults to `http://localhost:5000` in dev).
3. **Existing Docker Architecture:**
   - Existing [docker-compose.yml](file:///d:/DRCH/docker-compose.yml) in repository root defines development services:
     - `postgres`: `postgis/postgis:15-3.3` on host port 5432 with volume `pgdata`.
     - `minio`: `minio/minio:latest` on host ports 9000 (API) and 9001 (Console) with volume `miniodata`.
   - Zero Dockerfiles currently exist in `backend/` or `frontend/`.
   - No `docker-compose.prod.yml` currently exists.

---

## 4. Production Target

The frozen production target is a **single-server Docker deployment fronted by a reverse proxy**:

```
                              ┌───────────────────────────────────────────────┐
                              │            Single Production Server           │
                              │                                               │
   HTTPS (443) / HTTP (80)    │   ┌───────────────────────────────────────┐   │
─────────────────────────────┼──>│             Reverse Proxy             │   │
   (Single Application Domain)│   │       (SSL Termination, Routing)      │   │
                              │   └──┬─────────────┬─────────────┬────────┘   │
                              │      │             │             │            │
                              │      │ /           │ /api/*      │ /socket.io │
                              │      │ /sw.js      │ /health     │            │
                              │      │ (Static)    │             │            │
                              │      v             v             v            │
                              │   ┌────────┐   ┌──────────────────────────┐   │
                              │   │Shared  │   │      Backend Server      │   │
                              │   │Assets  │   │      (Express 5 / Node)  │   │
                              │   │Volume  │   │     (Port 5000 Internal) │   │
                              │   └────────┘   └─────────────┬────────────┘   │
                              │                              │                │
                              │           Docker Internal    │ (Private Net)  │
                              │           Network Only       │                │
                              │                   ┌──────────┴──────────┐     │
                              │                   v                     v     │
                              │        ┌─────────────────────┐   ┌─────────┐  │
                              │        │  PostgreSQL/PostGIS │   │  MinIO  │  │
                              │        │   (Port 5432 Int)   │   │(Port9000│  │
                              │        │   [pgdata volume]   │   │[miniodt]│  │
                              │        └─────────────────────┘   └─────────┘  │
                              └───────────────────────────────────────────────┘
```

* **Public Exposure:** Only Reverse Proxy ports (80/443) are published to the host.
* **Internal Network:** PostgreSQL, MinIO, and Backend containers communicate across an isolated internal Docker bridge network (`drch-internal`).
* **Storage Isolation:** PostgreSQL and MinIO persist to named volumes (`drch-pgdata`, `drch-miniodata`).
* **Zero Public Leakage:** Database and MinIO ports are strictly not published to the external interface.

---

## 5. Required Docker Artifacts

Step 5 implementation must create exactly the following artifacts:

| Artifact Path | Target Component | Purpose & Concrete Mechanism |
|---------------|------------------|------------------------------|
| `backend/Dockerfile` | Backend Container | Multi-stage build (`builder` with Node 20 Alpine + TypeScript, `runner` with Node 20 Alpine minimal). Installs production dependencies only; runs `node dist/index.js` as unprivileged non-root user. |
| `frontend/Dockerfile` | Frontend Build & Asset Exporter | Multi-stage build (`builder` with Node 20 Alpine + Vite compiling to `/app/dist`; `exporter` with minimal Alpine image copying `/app/dist` into the shared named volume `drch-frontend-assets`). Avoids long-running Node server in production. |
| `reverse-proxy/nginx.conf` (or chosen proxy config) | Reverse Proxy Configuration | Configures SSL/TLS termination, HTTP-to-HTTPS redirect, static file serving from mounted `/usr/share/nginx/html/`, SPA fallback (`try_files $uri $uri/ /index.html`), `/sw.js` root delivery with required service worker headers, `/health` and `/api/*` proxying, and `/socket.io/*` WebSocket connection upgrades. |
| `docker-compose.prod.yml` | Production Orchestration | Declarative single-server production deployment combining ephemeral asset sync container, reverse proxy, backend, postgres, and minio on an isolated network with restart policies and health checks. |
| `.env.production.example` | Deployment Configuration | Comprehensive production environment variable template with zero real secrets. |

---

## 6. Production Compose Architecture

The proposed `docker-compose.prod.yml` defines the following concrete services:

### Services

1. **`frontend` (Ephemeral Asset Sync Service):**
   - Build: `context: ./frontend`, `dockerfile: Dockerfile`.
   - Purpose: Compiles frontend SPA during image build; on startup copies `/dist/*` into the shared volume `drch-frontend-assets` and cleanly exits.
   - Volumes: `drch-frontend-assets:/usr/share/nginx/html`.
   - Restart: `"no"` (one-shot task container).

2. **`reverse-proxy` (Web Server & Gateway):**
   - Image: Reverse proxy daemon (e.g. `nginx:alpine`, pending Decision 5.1 approval).
   - Ports: `80:80`, `443:443` (host-published).
   - Volumes:
     - `drch-frontend-assets:/usr/share/nginx/html:ro` (read-only access to compiled SPA).
     - SSL certificates volume / mount (provisioning mechanism pending Decision 5.2 approval).
     - Proxy configuration mount.
   - Depends On:
     - `frontend`: `condition: service_completed_successfully` (ensures assets are fully populated before proxy serves requests).
     - `backend`: `condition: service_healthy` (ensures backend is ready to accept API and health check traffic).
   - Verification Status: Classified as **"running + functional"** (status `running`). Does not require an in-container healthcheck package; verified functionally via HTTP/HTTPS requests to `/`, `GET /health`, `/api/*`, `/socket.io`, and `/sw.js`.
   - Restart: `unless-stopped`.

3. **`backend` (API & Socket Server):**
   - Build: `context: ./backend`, `dockerfile: Dockerfile`.
   - Ports: None published to host (internal port 5000 only).
   - Environment: Injected from `.env.production` via Docker Compose.
   - Depends On:
     - `postgres`: `condition: service_healthy`
     - `minio`: `condition: service_healthy`
   - Restart: `unless-stopped`.
   - **Healthcheck (Alpine compatible, zero extra dependencies):**
     ```yaml
     healthcheck:
       test: ["CMD", "node", "-e", "fetch('http://localhost:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
       interval: 10s
       timeout: 5s
       retries: 3
       start_period: 15s
     ```

4. **`postgres` (Database):**
   - Image: `postgis/postgis:15-3.3`.
   - Ports: None published to host (internal port 5432 only).
   - Environment: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.
   - Volumes: `drch-pgdata:/var/lib/postgresql/data`.
   - Restart: `unless-stopped`.
   - Healthcheck:
     ```yaml
     healthcheck:
       test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
       interval: 10s
       timeout: 5s
       retries: 5
     ```

5. **`minio` (S3 Object Storage):**
   - Image: `minio/minio:latest`.
   - Command: `server /data`.
   - Ports: None published to host (internal port 9000 only).
   - Environment: `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`.
   - Volumes: `drch-miniodata:/data`.
   - Restart: `unless-stopped`.
   - Healthcheck:
     ```yaml
     healthcheck:
       test: ["CMD-SHELL", "curl -f http://localhost:9000/minio/health/live || exit 1"]
       interval: 10s
       timeout: 5s
       retries: 3
     ```

### Networks
* `drch-network`: Bridge driver, isolated internal communication.

### Volumes
* `drch-pgdata`: Persistent storage for PostgreSQL data.
* `drch-miniodata`: Persistent storage for MinIO S3 media objects.
* `drch-frontend-assets`: Shared ephemeral volume transferring compiled frontend assets from `frontend` exporter to `reverse-proxy`.

---

## 7. Reverse Proxy Plan

### Responsibilities
1. **SSL/TLS Termination:**
   - Terminates HTTPS on port 443 with TLSv1.2 and TLSv1.3.
   - Automatically redirects port 80 (HTTP) to port 443 (HTTPS).
   - Mounts production certificates provisioned according to approved Decision 5.2.
2. **Path-Based Routing:**
   - `/health` -> Forwarded directly to `http://backend:5000/health`.
   - `/api/*` -> Forwarded to `http://backend:5000/api/*`.
   - `/socket.io/*` -> Forwarded to `http://backend:5000/socket.io/*` with HTTP/1.1 and headers:
     - `Upgrade: $http_upgrade`
     - `Connection: "Upgrade"`
     - `Host: $host`
     - `X-Forwarded-For: $proxy_add_x_forwarded_for`
     - `X-Forwarded-Proto: $scheme`
   - `/sw.js` -> Served directly from `/usr/share/nginx/html/sw.js` with `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.
   - `/*` (SPA Routes) -> Served from static bundle; fallback to `/index.html` via `try_files $uri $uri/ /index.html`.
3. **Security Headers & Reverse Proxy Hop:**
   - Appends `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.
   - Express receives requests from reverse proxy as 1 hop (`TRUST_PROXY_HOPS=1`), correctly extracting client IP from `X-Forwarded-For` for rate limiting.
4. **Direct Exposure Policy:**
   - Backend (5000), PostgreSQL (5432), and MinIO (9000/9001) are strictly unreachable from the external network.

---

## 8. Backend Production Plan

### Container Build (`backend/Dockerfile`)
* **Stage 1 (Builder):**
  - Base: `node:20-alpine`.
  - Copies `package.json`, `package-lock.json`, and installs full dependencies (`npm ci`).
  - Copies `src/` and `tsconfig.json`.
  - Compiles TypeScript: `npm run build` -> outputs to `/app/dist`.
* **Stage 2 (Runner):**
  - Base: `node:20-alpine`.
  - Installs production-only dependencies (`npm ci --omit=dev`).
  - Copies compiled `/app/dist` from Stage 1.
  - Adds unprivileged non-root system user (`nodeuser`, UID 10001) and switches to it (`USER nodeuser`).
  - Exposes internal port `5000`.
  - CMD: `["node", "dist/index.js"]`.

### Runtime Environment Expectations
* Receives validated environment variables via Docker Compose.
* Connects to PostgreSQL using `DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}`.
* Connects to MinIO using `S3_ENDPOINT=http://minio:9000`.
* Operates in `NODE_ENV=production`.
* Executes graceful shutdown upon receiving `SIGTERM` from Docker engine.

---

## 9. Frontend Production Plan

### Concrete Build & Static Delivery Strategy
To strictly satisfy all requirements without introducing an unnecessary production Node server:

1. **Multi-Stage `frontend/Dockerfile`:**
   - **Stage 1 (`builder`):**
     - Base: `node:20-alpine`.
     - Sets `ENV VITE_API_URL=""` (empty string for relative same-origin API calls).
     - Copies `package.json`, `package-lock.json`, and installs dependencies (`npm ci`).
     - Copies frontend source code and configuration.
     - Runs `npm run build` (`tsc && vite build`) -> outputs production bundle to `/app/dist`.
   - **Stage 2 (`exporter`):**
     - Base: `alpine:latest`.
     - Copies `/app/dist` from Stage 1 into `/dist`.
     - CMD: `["sh", "-c", "cp -r /dist/* /usr/share/nginx/html/ && echo 'Assets copied successfully'"]`.
2. **Orchestration Lifecycle:**
   - On `docker compose -f docker-compose.prod.yml up`, the `frontend` container runs, populates the shared volume `drch-frontend-assets`, and exits cleanly.
   - The `reverse-proxy` container starts after `frontend` completes successfully, mounting `drch-frontend-assets:/usr/share/nginx/html:ro`.
3. **Static Serving Rules:**
   - `/assets/*`: Served with `Cache-Control: public, max-age=31536000, immutable`.
   - `/index.html`: Served with `Cache-Control: no-cache` to ensure instant cache invalidation upon redeployment.
   - `/sw.js`: Served from domain root with `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.
   - All other routes: Handled via `try_files $uri $uri/ /index.html` for clean React Router client-side navigation.

---

## 10. PostgreSQL / PostGIS Plan

* **Image:** `postgis/postgis:15-3.3` (identical to development container to guarantee 100% spatial function compatibility).
* **Storage:** Persistent named volume `drch-pgdata` mounted at `/var/lib/postgresql/data`.
* **Database Initialization:**
  - Idempotent script [backend/src/db/init.ts](file:///d:/DRCH/backend/src/db/init.ts) remains the approved initialization standard (Contract §10.3).
  - Executed explicitly via one-off container command before initial startup:
    ```bash
    docker compose -f docker-compose.prod.yml run --rm backend npm run db:init
    ```
  - Re-executing is completely safe due to `IF NOT EXISTS` guards on all extensions, tables, indices, and role seeds.
* **Network Boundary:** Internal Docker network only; no external port publishing.

---

## 11. MinIO Plan

* **Image:** `minio/minio:latest`.
* **Storage:** Persistent named volume `drch-miniodata` mounted at `/data`.
* **Credentials:** Injected via `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` deployment secrets.
* **Access Boundary:** Accessible only to backend via `http://minio:9000`. Console port 9001 is disabled or kept internal.
* **Bucket Provisioning:** Backend storage service [backend/src/services/storage.service.ts](file:///d:/DRCH/backend/src/services/storage.service.ts) automatically verifies and creates `drch-media` bucket on initialization.

---

## 12. Environment & Secrets Matrix

Inventory of all production environment variables across all components:

| Variable Name | Component | Classification | Required in Prod? | Production Source | Document in `.env.production.example`? |
|---------------|-----------|----------------|:-----------------:|-------------------|:---------------------------------------:|
| `NODE_ENV` | Backend | Safe Config | **YES** | Set to `production` | **YES** (`production`) |
| `PORT` | Backend | Safe Config | **YES** | Set to `5000` | **YES** (`5000`) |
| `DATABASE_URL` | Backend | Sensitive Secret | **YES** | Deployment secret / Compose | **YES** (safe placeholder) |
| `POSTGRES_USER` | Postgres | Sensitive Config | **YES** | Deployment secret | **YES** (placeholder) |
| `POSTGRES_PASSWORD` | Postgres | High Secret | **YES** | Deployment secret | **YES** (placeholder) |
| `POSTGRES_DB` | Postgres | Safe Config | **YES** | Deployment config | **YES** (`drch_prod`) |
| `JWT_ACCESS_SECRET` | Backend | High Secret | **YES** | Deployment secret (>= 64 chars) | **YES** (placeholder) |
| `JWT_REFRESH_SECRET` | Backend | High Secret | **YES** | Deployment secret (>= 64 chars) | **YES** (placeholder) |
| `COOKIE_DOMAIN` | Backend | Safe Config | Optional | Empty / set if subdomains used | **YES** (empty default) |
| `FRONTEND_URL` | Backend | Safe Config | **YES** | Public HTTPS domain (e.g. `https://drch.example.com`) | **YES** (placeholder) |
| `TRUST_PROXY_HOPS` | Backend | Safe Config | **YES** | Set to `1` | **YES** (`1`) |
| `S3_ENDPOINT` | Backend | Safe Config | **YES** | Set to `http://minio:9000` | **YES** (`http://minio:9000`) |
| `S3_REGION` | Backend | Safe Config | **YES** | Set to `us-east-1` | **YES** (`us-east-1`) |
| `S3_ACCESS_KEY` | Backend | Sensitive Secret | **YES** | Deployment secret | **YES** (placeholder) |
| `S3_SECRET_KEY` | Backend | High Secret | **YES** | Deployment secret | **YES** (placeholder) |
| `S3_BUCKET_NAME` | Backend | Safe Config | **YES** | Set to `drch-media` | **YES** (`drch-media`) |
| `MINIO_ROOT_USER` | MinIO | Sensitive Secret | **YES** | Deployment secret (matches S3_ACCESS_KEY) | **YES** (placeholder) |
| `MINIO_ROOT_PASSWORD`| MinIO | High Secret | **YES** | Deployment secret (matches S3_SECRET_KEY) | **YES** (placeholder) |
| `VAPID_PUBLIC_KEY` | Backend | Public Key | **YES** | 65-byte base64url generated key | **YES** (placeholder) |
| `VAPID_PRIVATE_KEY`| Backend | High Secret | **YES** | 32-byte base64url generated key | **YES** (placeholder) |
| `VAPID_SUBJECT` | Backend | Safe Config | **YES** | Valid `mailto:` or URL | **YES** (placeholder) |
| `GEMINI_API_KEY` | Backend | High Secret | Optional | Production Gemini API key | **YES** (placeholder) |
| `GEMINI_MODEL` | Backend | Safe Config | **YES** | `gemini-2.5-flash` | **YES** (`gemini-2.5-flash`) |
| `VITE_API_URL` | Frontend | Safe Config | **YES** | Empty string `""` (relative for same-domain) | **YES** (`""`) |

---

## 13. Security Requirements

1. **No Hardcoded Secrets:** Zero credentials committed to Git; all secrets provided via environment variables.
2. **Network Isolation:** Only ports 80 and 443 are published to the host. PostgreSQL (5432), MinIO (9000), and Backend (5000) remain strictly private to Docker bridge network.
3. **Non-Root Execution:** Backend Docker container runs as unprivileged user (`nodeuser`, UID 10001).
4. **Helmet & CSP:** Production Helmet directives in `app.ts` enforced; CSP restricts script and frame execution.
5. **CORS Validation:** `FRONTEND_URL` strictly validated; wildcard origins rejected.
6. **Rate Limiting & Proxy Hops:** `TRUST_PROXY_HOPS=1` ensures client IPs are extracted accurately from single reverse proxy.
7. **HttpOnly & Secure Cookies:** `secure: true` in production; `httpOnly: true`; `sameSite: 'strict'`.
8. **VAPID Key Isolation:** Private key never leaves the backend container.
9. **Persistent Volume Security:** Docker named volumes are isolated from host filesystem root.

---

## 14. Health / Startup / Shutdown Plan

### Health & Verification Strategy by Service
* **`backend`:** Healthchecked via Docker using native Node.js fetch (zero external dependencies, 100% Alpine compatible):
  ```bash
  node -e "fetch('http://localhost:5000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
  ```
  Returns `{ ok: true, data: { status: 'healthy', timestamp } }`. Not rate-limited.
* **`postgres`:** Healthchecked via Docker using `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}`.
* **`minio`:** Healthchecked via Docker using `curl -f http://localhost:9000/minio/health/live || exit 1`.
* **`frontend`:** Ephemeral one-shot asset exporter; completes with exit code 0 (`condition: service_completed_successfully`).
* **`reverse-proxy`:** Classified as **"running + functional"** (status `running`). Avoids adding unneeded packages into the proxy container; functional verification is executed via:
  - HTTP/HTTPS requests to `/` (SPA loading)
  - `GET /health` (backend proxying)
  - `/api/*` (API proxying)
  - `/socket.io` (WebSocket connection upgrade)
  - `/sw.js` (Service Worker root delivery)

### Startup Sequence & Dependency Management
1. Docker starts `postgres` and `minio`.
2. Healthchecks monitor database readiness (`pg_isready`) and MinIO readiness (`curl`).
3. Backend starts only after `postgres` and `minio` report healthy status (`depends_on: condition: service_healthy`).
4. Backend boots up: verifies database connection, checks MinIO bucket, initializes Socket.IO, schedules session cleanup, registers signal handlers, and listens on port 5000.
5. `frontend` container copies static assets to `drch-frontend-assets` and completes.
6. `reverse-proxy` starts after `frontend` completes successfully and `backend` reports healthy via `GET /health`.

### Shutdown Behavior
* Docker sends `SIGTERM` to containers.
* Backend catches `SIGTERM` and initiates graceful shutdown:
  1. Stops accepting new incoming HTTP connections (`server.close()`).
  2. Closes Socket.IO connections (`io.close()`).
  3. Drains PostgreSQL pool (`pool.end()`).
  4. Stops session cleanup interval (`stopSessionCleanup()`).
  5. Exits cleanly (exit code 0).
  6. 10-second unref timer guarantees process termination if connections hang.

---

## 15. Testing & Verification Plan

Step 5 implementation will be validated against the following 17-point test plan:

1. **Backend Build Verification:** Run `npm run build` in `backend/` to verify clean TypeScript compilation.
2. **Frontend Build Verification:** Run `npm run build` in `frontend/` to verify clean Vite production bundle.
3. **Backend Dockerfile Build:** Execute `docker build -t drch-backend:prod ./backend` and confirm zero errors.
4. **Frontend Dockerfile Build:** Execute `docker build -t drch-frontend:prod ./frontend` and confirm asset compilation.
5. **Docker Compose Validation:** Run `docker compose -f docker-compose.prod.yml config` to validate compose schema.
6. **Container Startup Test:** Launch stack via `docker compose -f docker-compose.prod.yml up -d` and inspect container status.
7. **PostgreSQL/PostGIS Connectivity:** Verify database container healthy and PostGIS extension enabled.
8. **MinIO Connectivity:** Verify MinIO container healthy and storage bucket reachable.
9. **Database Initialization Verification:** Execute `docker compose -f docker-compose.prod.yml run --rm backend npm run db:init` and verify table creation.
10. **Backend Health Check:** Verify `GET /health` (via `http://localhost/health` or internal Node healthcheck) returns 200 with `{ ok: true, data: { status: 'healthy', timestamp } }`.
11. **Frontend SPA Routing:** Request root `/` and deep routes (e.g. `/public-map`, `/login`) and confirm HTTP 200 with `index.html`.
12. **API Proxying Verification:** Send request to `https://<domain>/api/v1/incidents/public` and verify correct reverse-proxy routing to backend.
13. **Socket.IO WebSocket Upgrade:** Establish Socket.IO connection over `wss://<domain>/socket.io` and verify WebSocket upgrade header handling.
14. **Service Worker Root Delivery:** Request `/sw.js` and verify HTTP 200 with `Service-Worker-Allowed: /` header.
15. **HTTPS & Cookie Security:** Confirm session and access token cookies include `Secure; HttpOnly; SameSite=Strict`.
16. **Graceful Shutdown Test:** Send `docker compose stop backend` and verify clean exit code 0 within shutdown timeout.
17. **Full Automated Regression:** Execute all 94 backend Vitest tests, 17 Jest tests, and 14 frontend tests.

---

## 16. Phase 1–4 Preservation

The proposed Docker architecture preserves all existing Phase 1–4 functionality without modification:

* **Authentication & RBAC:** Unchanged; runs in Node 20 runtime with identical token verification.
* **Incidents & PostGIS Queries:** Unchanged; uses identical PostgreSQL 15 + PostGIS 3.3 engine.
* **AI Verification & Fallback:** Unchanged; environment variables passed to container.
* **Shelters & Proximity Searches:** Unchanged.
* **Socket.IO Live Citizen Feeds:** Unchanged; reverse proxy configured with standard WebSocket upgrade headers.
* **Alerts & Spatial Targeting:** Unchanged.
* **Resources & Allocations:** Unchanged.
* **Notifications & Web Push:** Unchanged; service worker served at domain root.
* **Audit Logging, Rate Limiting, Security Hardening:** Unchanged; running in production container.

---

## 17. Out of Scope

The following items are **STRICTLY OUT OF SCOPE** for Step 5:

* **Kubernetes (k8s) manifests or Helm charts.**
* **Microservices architecture or splitting backend into multiple services.**
* **Redis, Memcached, RabbitMQ, Kafka, or external queues.**
* **MongoDB or secondary databases.**
* **Cloud-provider-specific proprietary infrastructure (AWS ECS, GCP Cloud Run, Azure App Services).**
* **CI/CD pipelines (GitHub Actions, GitLab CI).**
* **Third-party database migration frameworks (Prisma, TypeORM, Flyway, Liquibase).**
* **Playwright E2E test implementation (allocated to separate subsequent step).**
* **Any modification to frozen Phase 1–4 application source code.**
* **Any modification to frozen Step 1–4 modules.**

---

## 18. Open Decisions

The following two decisions are explicitly documented as **OPEN** and require formal user/team review and approval prior to Step 5 implementation:

### Decision 5.1: Choice of Reverse Proxy Container Image
* **Status:** OPEN — requires approval
* **Contract Reference:** Contract §10.2 specifies "reverse proxy" without hardcoding the daemon technology.
* **Options:**
  - **Option A (Recommended): `nginx:alpine`**
    - *Rationale:* Industry-standard, ultra-lightweight (<30MB), native support for static SPA serving, fine-grained WebSocket proxying, and battle-tested HTTP/2 & SSL termination.
  - **Option B: `caddy:alpine`**
    - *Rationale:* Automatic HTTPS via Let's Encrypt, simple configuration syntax, slightly higher memory footprint.
  - **Option C: `traefik:v3`**
    - *Rationale:* Label-based Docker routing, more complex configuration for static file serving.
* **Recommendation:** **Option A (`nginx:alpine`)**.
* **Current State:** **OPEN — requires approval**. Implementation will NOT proceed until this choice is explicitly confirmed.

### Decision 5.2: Production TLS Certificate Provisioning
* **Status:** OPEN — requires approval
* **Contract Reference:** Contract §10.2 requires reverse proxy HTTPS on port 443 with TLS termination and certificate mounting, but does not define how production TLS certificates are obtained or renewed.
* **Implementation Options (Non-Binding):**
  - **Option A: Externally Provisioned Certificate/Key**
    - *Mechanism:* Server administrator / hosting environment provisions a valid SSL/TLS certificate (e.g. wildcard or domain cert) and mounts it into the reverse-proxy container via deployment secrets/volume mount (`/etc/ssl/certs`).
  - **Option B: Let's Encrypt / ACME-Based Automated Provisioning**
    - *Mechanism:* Reverse proxy or companion ACME tool acquires and renews certificates automatically via HTTP-01 or DNS-01 challenges.
  - **Option C: Another Explicitly Approved Certificate Mechanism**
    - *Mechanism:* Dedicated enterprise or hosting provider certificate injection.
* **Current State:** **OPEN — requires approval**. Implementation will NOT proceed until the certificate acquisition and renewal mechanism is officially selected and approved.

*(Note: Former Decision 5.2 on frontend static delivery architecture has been concretely resolved in Section 9 via the Shared Named Volume Multi-Stage Exporter pattern, avoiding any long-running frontend Node.js server and preserving the required `frontend/Dockerfile` artifact).*

---

## 19. Proposed Implementation Order

Once Decisions 5.1 and 5.2 are approved, Step 5 implementation shall proceed in the following strict sequential order:

1. **Obtain user/team approval for Decisions 5.1 and 5.2.**
2. **Create `backend/Dockerfile`** (Multi-stage Node 20 Alpine build).
3. **Create `frontend/Dockerfile`** (Multi-stage Vite build with asset-sync exporter).
4. **Create `reverse-proxy/nginx.conf`** (or chosen proxy configuration with approved TLS setup).
5. **Create `docker-compose.prod.yml`** (Production orchestration specification).
6. **Create `.env.production.example`** (Production environment documentation template).
7. **Perform Docker build & validation tests** (Image builds, compose config validation).
8. **Perform runtime verification** (Container startup, DB init, `GET /health`, proxy routing).
9. **Execute full regression test suite** (Vitest, Jest, frontend, tsc builds).
10. **Deliver Step 5 Implementation Report.**

---

## 20. Acceptance Criteria

Step 5 shall be evaluated against the following criteria:

1. `backend/Dockerfile` builds cleanly without warnings and emits a production-ready container image.
2. `frontend/Dockerfile` builds cleanly and emits compiled SPA assets.
3. `docker-compose.prod.yml` passes configuration linting (`docker compose config`) with zero syntax errors.
4. Core infrastructure services (`postgres`, `minio`, `backend`) achieve healthy status; `frontend` asset sync container completes successfully; `reverse-proxy` achieves running status with full functional verification passing.
5. Database initialization via `docker compose run --rm backend npm run db:init` executes cleanly and idempotently.
6. Public requests to `/` and `/public-map` return the SPA `index.html`.
7. Public requests to `/health` return HTTP 200 `{ ok: true, data: { status: 'healthy', timestamp } }`.
8. Public requests to `/sw.js` return the service worker with appropriate headers.
9. Ports 5432, 5000, and 9000 are not reachable from outside the host.
10. All 94 backend Vitest tests pass without regression.
11. All 17 Jest authentication/RBAC/AI tests pass without regression.
12. All 14 frontend tests pass without regression.
13. Backend and frontend production builds complete with exit code 0.

---

## 21. Freeze Criteria

Phase 5 Step 5 may be declared **FROZEN** only when:

1. All required Step 5 Docker artifacts are created and verified.
2. Decisions 5.1 and 5.2 are officially approved and recorded.
3. Automated and manual container verification steps pass completely.
4. A post-implementation read-only audit verifies 0 contract deviations.
5. All regression test suites pass with 100% pass rates.
6. Official freeze record `/Docs/phase5_step5_freeze_record.md` is generated.
7. Step 1 through Step 4 remain frozen.
8. Playwright E2E testing remains NOT STARTED until Step 5 is officially frozen.
