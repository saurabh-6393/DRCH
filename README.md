# Disaster Response & Coordination Hub (DRCH)

A real-time, GIS-enabled emergency coordination platform designed for disaster reporting, multi-tier incident verification (multimodal AI advisory + human volunteer review + official authority validation), spatial shelter routing, and geofenced emergency alerts.

---

## Architecture Overview

```
                      +-----------------------------------+
                      |   Client Web Application (SPA)    |
                      |   React 19 / TypeScript / Vite    |
                      +-----------------+-----------------+
                                        |
                         HTTP(S) / WSS  | (Port 80 / 443)
                                        v
                      +-----------------+-----------------+
                      |       Nginx Reverse Proxy         |
                      |  (TLS Termination & Static SPA)   |
                      +-----------------+-----------------+
                                        |
                        Reverse Proxy   | (Port 5000)
                                        v
                      +-----------------+-----------------+
                      |       Backend API Server          |
                      |    Node.js / Express 5 / TS       |
                      |  (REST API & Socket.IO Realtime)  |
                      +-------+-----------------+---------+
                              |                 |
            PostgreSQL Pool   |                 | S3 Protocol
            (Port 5432)       |                 | (Port 9000)
                              v                 v
            +-----------------+---+   +---------+---------+
            |  PostgreSQL 15      |   |  MinIO Object     |
            |  + PostGIS 3.3      |   |  Storage (Media)  |
            +---------------------+   +-------------------+
```

---

## Key Capabilities

1. **Incident Reporting with Evidence:** Citizens submit incident reports with geographic coordinates, categories, descriptions, and media attachments.
2. **Multimodal AI Advisory (Google Gemini):** AI evaluates submitted evidence against the reporter's description and assigns verification priority (`EXPEDITED`, `NORMAL`, `LOW`, `AI_UNAVAILABLE`). The AI operates strictly as an advisory triage filter and never self-publishes or finalizes incidents.
3. **Multi-Tier Human Review Pipeline:**
   - **Stage 1 (Submission & AI Triage):** Citizen submits report; Gemini analyzes image and flags severity.
   - **Stage 2 (Volunteer / NGO Review):** Volunteers and NGOs review evidence in the queue, recommending `ESCALATE`, `DISMISS`, or `REQUEST_INFO`.
   - **Stage 3 (Authority Verification):** Official dispatchers make the final determination (`VERIFIED` or `REJECTED`) and assign official severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
4. **Privacy-Preserving Public Map:**
   - Only officially `VERIFIED` incidents are published to the public.
   - Incident coordinates are rounded to 2 decimal places (~1.1 km precision) to safeguard victim and reporter privacy.
   - Features a high-reliability direct coordinate grid fallback when vector tile services are offline.
5. **PostGIS Spatial Shelters & Proximity Routing:** PostGIS spatial queries calculate spherical distances (`ST_DistanceSphere`) to match citizens with nearby operational shelters.
6. **Geofenced Emergency Alerts:** Authorities publish broadcast alerts geofenced to GeoJSON hazard polygons, automatically distributed via Socket.IO and Web Push.
7. **Security & Audit Logging:** HttpOnly, SameSite=Strict cookie sessions, bcrypt password hashing, fine-grained RBAC, rate limiting, and immutable audit logs with automated secret redaction.

---

## Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router 7, TanStack Query 5, Mapbox GL.
- **Backend:** Node.js 20+, Express 5, TypeScript, Socket.IO 4, Web-Push, Zod, Bcrypt, Helmet, Express-Rate-Limit.
- **Database & Spatial Engine:** PostgreSQL 15 with PostGIS 3.3 extension (`postgis/postgis:15-3.3`).
- **Object Storage:** MinIO S3-compatible storage (`minio/minio:latest`).
- **Containerization & Delivery:** Docker, Docker Compose, Nginx Alpine.

---

## User Roles & Permissions

| Role | Capabilities |
| :--- | :--- |
| **`CITIZEN`** | Submit incident reports, track own report history, browse public verified map, search nearby shelters, receive geofenced alerts. |
| **`VOLUNTEER`** | Citizen capabilities + access the Verification Queue and submit Stage 2 recommendations (`ESCALATE`, `DISMISS`, `REQUEST_INFO`). |
| **`NGO`** | Volunteer capabilities + register emergency resources and manage inventory allocations. |
| **`AUTHORITY`** | Full dispatch control: execute Stage 3 incident verification (`VERIFIED`/`REJECTED`), assign severity levels, and create/cancel geofenced emergency alerts. |
| **`ADMIN`** | Full system supervision, user role assignments, audit log review, and platform administration. |

---

## Project Structure

```
DRCH/
├── backend/                       # Express 5 REST API & Socket.IO server
│   ├── src/
│   │   ├── config/                # Environment schema (Zod) & database pool
│   │   ├── middleware/            # Auth, RBAC, rate limiting, audit logging
│   │   ├── modules/               # Domain modules (auth, incidents, shelters, alerts, audit)
│   │   ├── services/              # Storage (S3), AI (Gemini), Web Push, Socket.IO
│   │   └── __tests__/             # Vitest & Jest test suites
│   ├── Dockerfile                 # Multi-stage production container
│   └── package.json
├── frontend/                      # React 19 Single Page Application
│   ├── src/
│   │   ├── api/                   # Typed Axios API clients
│   │   ├── components/            # Layout, Mapbox fallback, NotificationPrompt
│   │   ├── context/               # AuthContext & session state
│   │   ├── features/              # Feature modules (incidents, shelters, queue)
│   │   ├── pages/                 # Route pages (Dashboard, PublicMap, Login, etc.)
│   │   └── __tests__/             # Frontend Vitest test suites
│   ├── Dockerfile                 # Asset builder & exporter container
│   └── package.json
├── reverse-proxy/                 # Nginx configuration for production SSL termination
│   └── nginx.conf
├── Docs/                          # Architecture contracts, specifications, and reports
├── docker-compose.yml             # Local development services (Postgres + MinIO)
├── docker-compose.prod.yml        # Production multi-service orchestration
└── README.md
```

---

## Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) v20 or higher
- [Docker Desktop](https://www.docker.com/) with Compose support
- Git

### 2. Environment Configuration

Copy the example environment files:

```bash
# Root environment (used by Docker Compose for local database & storage)
cp .env.example .env

# Backend environment
cp backend/.env.example backend/.env
```

The default values in `.env.example` and `backend/.env.example` are configured to work out-of-the-box for local development.

### 3. Start Infrastructure Services

Start PostgreSQL with PostGIS and MinIO in the background:

```bash
docker compose up -d
```

Verify services are running:
- PostgreSQL: `localhost:5432`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001` (Use the MinIO credentials configured in your local .env file. The .env.example file provides safe placeholders.)

### 4. Initialize Database Schema & Seed Data

From the `backend` directory, run the idempotent database initializer:

```bash
cd backend
npm install
npm run db:init
```

This creates all 16 relational and spatial tables, PostGIS extensions, and default roles (`CITIZEN`, `VOLUNTEER`, `NGO`, `AUTHORITY`, `ADMIN`).

### 5. Start Backend Server

```bash
# Inside backend directory
npm run dev
```

The API will start at `http://localhost:5000`. Health check endpoint: `GET http://localhost:5000/health`.

### 6. Start Frontend Development Server

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The web application will open at `http://localhost:5173`.

---

## Running Automated Tests

All test suites can be executed locally without external cloud dependencies:

```bash
# Backend Vitest Suite (Security, Push, Rate Limiting, Audit, Alerts, Notifications)
cd backend
npm run test:vitest

# Backend Jest Suite (Auth, RBAC, AI Fallback, Token Verification)
npm run test:jest

# Frontend Vitest Suite (Components, Routes, Form Validation)
cd ../frontend
npm run test

# Full Production Typecheck & Compilation
cd ../backend && npm run build
cd ../frontend && npm run build
```

---

## Security Model & AI Human-in-the-Loop

- **Advisory AI Model:** Google Gemini multimodal vision provides advisory priority tagging (`EXPEDITED`, `NORMAL`, `LOW`, `AI_UNAVAILABLE`). AI recommendations never alter incident publication status.
- **Strict Human-in-the-Loop:** Only official authorities (`AUTHORITY` or `ADMIN`) can transition an incident to `VERIFIED`. Only verified incidents appear on public feeds.
- **Defense in Depth:**
  - Token storage: Double-cookie pattern (`access_token` 15m, `refresh_token` 7d) with `HttpOnly`, `SameSite=Strict`, and `Secure` flags.
  - Rate Limiting: Distinct limits for authentication (5 req/15m), public queries (100 req/15m), and incident creation (10 req/15m).
  - Data Protection: Coordinates rounded on public endpoints; reporter IDs excluded from public queries; storage secrets scrubbed from audit logs.

---

## Known Deployment Limitations

- **Externally Provisioned TLS (Decision 5.2):** Production orchestration (`docker-compose.prod.yml`) relies on externally provisioned SSL certificates mounted to `/etc/ssl/certs/drch.crt` and `/etc/ssl/private/drch.key`. Automated ACME/Certbot provisioning is intentionally not bundled to accommodate air-gapped emergency networks and enterprise reverse proxies.
- **Mapbox Vector Tiles:** When `VITE_MAPBOX_TOKEN` is unset or offline, the platform automatically activates high-reliability Direct Coordinate Mode to ensure dispatch operations continue uninterrupted.
