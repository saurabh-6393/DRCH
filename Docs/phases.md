# Phases

> Development roadmap and implementation milestones for the Disaster Response Platform.
> Phases 1 to 4 comprise the functional MVP. Phase 5 is designated for non-feature hardening and stabilization.

---

## Phase 1 — Foundation
### Objectives
Establish a robust, reproducible local development sandbox, configure the compilation and formatting environments, design the modular database baseline, and implement a secure, revocable token authentication system.

### Features
* Secure Citizen registration, login, and token-based logout.
* Route protection guards checking active role sets.
* System database schema initialization (roles, default profiles).

### Technical Tasks
1. Initialize the monorepo workspace containing separate `backend/` and `frontend/` sub-directories.
2. Formulate TypeScript compilation settings (`tsconfig.json`) for backend node processes and frontend React bundlers.
3. Implement server-side request and input validation.
4. Compose `docker-compose.yml` defining PostgreSQL + PostGIS (v15-3.3) and MinIO storage emulators.
5. Configure the backend data-access layer and PostgreSQL connection management.
6. Design and document the database schema baseline and enable the PostGIS extension in the development database. Do not create database migrations during the documentation/foundation setup stage. The final schema creation/migration mechanism and UUID generation mechanism will be finalized immediately before database implementation.
7. Implement JWT authorization (Access tokens: 15-minute expiry in cookies; Refresh tokens: 7-day expiry, hashed prior to database write).
8. Scaffold the frontend client using React, TypeScript, Vite, and Tailwind CSS.
9. Setup Jest and Supertest configurations on the backend, and Vitest configurations on the frontend.

### Dependencies
* Requires Docker and Docker Compose installed on host machine.

### Acceptance Criteria
* Backend server boots on port `5000` and successfully parses all parameters in `.env`.
* Postgres connects and successfully seeds standard database roles (`CITIZEN`, `VOLUNTEER`, `NGO`, `AUTHORITY`, `ADMIN`).
* User registration creates a row in the database, hashes the password using bcrypt/Argon2id, and logging in generates HTTP-Only Secure cookie configurations.
* React development server boots on port `5173`.

### Testing Requirements
* **Backend:** Health check `/health` integration testing. Auth route tests (success/fail registration, correct JWT signatures).
* **Frontend:** Math and basic component render checking via Vitest.

---

## Phase 2 — Incident Reporting + AI
### Objectives
Implement structured incident reporting workflows for citizens, support secure image evidence storage, and integrate Google Gemini for automated multimodal check analysis.

### Features
* Structured incident report submission (type, description, coordinates, evidence image upload).
* Secure backend-mediated image upload and S3-compatible storage.
* Gemini consistency check providing advisory scores and anomalies.
* Citizen dashboard displays reporting status and history.

### Technical Tasks
1. Build `incidents` creation API supporting multipart form-data.
2. Implement backend-mediated media upload with 5MB size validation, allowed media-type validation, magic-byte validation, and secure S3/MinIO persistence.
3. Integrate Google Gemini SDK targeting `gemini-2.5-flash` model.
4. Construct server-side system prompts enforcing structured JSON verification output (confidence, anomalies, priority, explanation).
5. Add backend image signature parsing (magic bytes checking) on incoming uploads.
6. Create `GET /api/v1/incidents/my-reports` fetching citizen draft histories.

### Dependencies
* Phase 1 must be fully complete.
* Google Gemini API key configured in `.env`.

### Acceptance Criteria
* Citizen can submit an incident with a validated image that is securely stored in S3-compatible storage.
* Backend rejects files larger than 5MB or files failing the allowed media-type and magic-byte validation before they are written to S3-compatible storage.
* AI consistency evaluation is executed when the provider is available and its structured result is persisted. If Gemini is unavailable, the incident remains eligible for human review with AI_UNAVAILABLE priority state.
* Reports successfully enter the database in `SUBMITTED` state, without triggering geofenced alerts.

### Testing Requirements
* **Integration Tests:** Endpoint testing for `POST /api/v1/incidents`.
* **Mock Tests:** Mock Gemini API responses to test priority calculations (`LOW`, `NORMAL`, `EXPEDITED`) and fallback logic (`AI_UNAVAILABLE`).
* **Validation Tests:** Upload validations for incorrect files.

---

## Phase 3 — Human Validation + Maps
### Objectives
Establish human-in-the-loop review boards, final Authority verification gates, Mapbox visual renderings, and geospatial proximity queries.

### Features
* Dashboard queues matching AI priorities for reviewers.
* Multi-stage human review recommendations logging.
* Final Authority verification sign-offs and severity configuration.
* Shelter register and location searches based on proximity.
* Mapbox map components showing active alerts, verified report pins, and route directions.

### Technical Tasks
1. Build review backlog queues (`GET /api/v1/verifications/queue`) filtering items based on AI priority thresholds.
2. Implement Stage 2 review recommendation routing (`POST /api/v1/verifications/:id/review`) for Volunteers and NGOs.
3. Implement Stage 3 Authority verify/reject and severity configuration endpoints.
4. Setup `organizations` tables and Shelter registry CRUD.
5. Write PostGIS distance search queries (`ST_DWithin` and `ST_Distance`) returning shelters sorted by capacity and meter distance.
6. Integrate Mapbox GL JS map modules, pin clustering overlays, and Route Directions APIs on the frontend.

### Dependencies
* Phase 2 incident database schemas and Gemini connections active.
* Mapbox access token configured.

### Acceptance Criteria
* Reviewers can view the queue sorted by AI priority.
* Volunteers and NGOs can write notes and recommendations, but are blocked from verifying.
* Authorities can verify incidents and set authoritative severity (`LOW` to `CRITICAL`).
* Map renders verified incident clusters and routes citizens to the closest operational shelter with open capacity.
* Public API responses sanitize sensitive reporter info and round exact coordinates.

### Testing Requirements
* **Geospatial Tests:** Unit testing for PostGIS distance calculation query accuracies.
* **Role Guards:** RBAC testing verifying that volunteers/NGOs cannot trigger Authority verification actions.
* **UI Tests:** Mapbox rendering and coordinate mapping checks.

---

## Phase 4 — Real-Time Response + Coordination
### Objectives
Integrate WebSockets for instant warning triggers, support radius-based geofenced alert broadcasts, and implement resource inventory distribution.

### Features
* WebSocket namespaces matching citizens and dispatches.
* Authority console to draw geofenced alerts.
* Instant client popup warning alerts.
* NGO supply registry and resource tracking.

### Technical Tasks
1. Setup Socket.IO wrapper server binding routes.
2. Implement geographic socket rooms grouping clients.
3. Build geofenced polygon/circle creation dashboard for Authorities.
4. Setup `resources` and `resource_allocations` query structures.
5. Create allocations routing linking items to multiple targets (shelters or incidents).

### Dependencies
* Phase 3 Authority sign-off gates and PostGIS extensions running.

### Acceptance Criteria
* Socket connection handshakes establish successfully.
* Authority broadcast instantly publishes warnings to all matching location socket rooms.
* NGOs can create resource stashes and divide quantities among multiple response targets.

### Testing Requirements
* **WebSocket Tests:** Mock socket client connections to verify alert broadcasts.
* **Database Tests:** Allocation integrity checks ensuring allocations do not exceed available quantities.

---

## Phase 5 — Hardening + Deployment
### Objectives
Secure final routes, trace administrative history, configure background push networks, and validate E2E user journeys.

### Features
* Full administrative audit trail.
* Web Push notifications for offline browser warnings.
* Rate limit protection.
* Production compilations.

### Technical Tasks
1. Build `audit_logs` tracking modules registering actions.
2. Configure Web Push/FCM browser registration subscriptions.
3. Integrate Helmet configuration and rate limit middleware checks.
4. Write Playwright E2E automation scripts mapping user workflows.
5. Build static Vite frontend assets and transpile backend TypeScript files.

### Dependencies
* Phases 1 to 4 must be completed.

### Acceptance Criteria
* Audit logging records defined critical actions including role modifications, final verification decisions, alert creation, shelter capacity changes, and other explicitly approved administrative/lifecycle actions.
* Background push alerts arrive on simulated browsers.
* Playwright test runner compiles zero-failure E2E reports.

### Testing Requirements
* **E2E Automation:** E2E tests (Citizen report -> AI analysis -> Volunteer review -> Authority verify -> Alert warning pushed).
* **Penetration & Security:** Test header policies, CORS rules, and rate limits.
