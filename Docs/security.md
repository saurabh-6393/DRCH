# Security

> Comprehensive documentation of the security architecture and validation constraints.

---

## 1. Authentication & Token Architecture
* **[Confirmed Requirement]** JWT-based authentication with server-side refresh-session state and revocation.
* **[Confirmed Requirement]** Token Strategy:
  * **Access Token:** Short-lived access tokens (15-minute expiry) signed with `JWT_ACCESS_SECRET`. Encapsulates client context: `{ id, roles }`.
  * **Refresh Token:** Long-lived refresh tokens (7-day expiry) signed with `JWT_REFRESH_SECRET`.
* **[Confirmed Requirement]** Storage: Access and Refresh tokens are stored in secure browser cookies:
  * `HttpOnly` enabled (blocks JavaScript script read attempts, mitigating XSS).
  * `Secure` enabled (forces SSL/TLS transmission in production).
  * `SameSite=Strict` configured (protects against Cross-Site Request Forgery - CSRF).
  * Raw refresh tokens must not be stored in client localStorage.
* **[Confirmed Requirement]** Refresh Token Hashing: Raw refresh tokens are never written to the database. The server hashes the refresh token using SHA-256 before comparing it to or writing it to the `sessions` metadata table (`token_hash` field).
* **[Confirmed Requirement]** Session Revocation: Logouts and administrative revocations set a `revoked_at` timestamp on the session row. Session refresh checks reject tokens whose database hashes match revoked or expired session rows.
* **[Engineering Decision]** Session rotation: When a new access token is requested via a refresh token, a new refresh token is generated, the old database session is marked as revoked, and a new hashed session row is created.

---

## 2. Authorization & RBAC
* **[Confirmed Requirement]** Role-based access control (RBAC) must be validated and enforced server-side.
* **[Confirmed Requirement]** Middleware route guards (`checkRole(['AUTHORITY', 'ADMIN'])`) verify that the user roles inside the parsed JWT token match allowed permissions before executing controller logic.

---

## 3. Location Privacy & API Sanitization
* **[Confirmed Requirement]** Public incident endpoints return intentionally rounded/approximate coordinates. Exact coordinate precision is protected by backend authorization.
* **[Confirmed Requirement]** Location permissions by role:
  * **Citizen/Public:** Sanitized public endpoints (e.g. `GET /api/v1/incidents`) return only rounded/approximate coordinates.
  * **Volunteer:** Exact coordinates are only available for reports assigned/eligible for active review tasks.
  * **NGO:** Exact coordinates are only visible within the NGO's authorized operational/geographic scope.
  * **Authority/Admin:** Direct access to exact coordinates for dispatch and auditing.
* **[Confirmed Requirement]** The public verified incident API does not expose the reporter's identity, raw AI scores, anomalies, private upload media keys, or review comments.

---

## 4. File Upload & Media Validation
* **[Confirmed Requirement]** The MVP enforces a backend-mediated upload flow where all media is streamed to the backend server first for verification before upload to permanent storage:
  $$\text{Client} \longrightarrow \text{Backend (Validation)} \longrightarrow \text{S3/MinIO Storage}$$
  Pre-signed direct client-to-S3 uploads are excluded from the MVP scope and may only be considered as a future optimization.
* **[Confirmed Requirement]** Validation constraints must be fully executed by the backend before a file is written to permanent storage:
  * **File Size:** Strictly limited to a maximum of 5MB.
  * **File Extension Whitelist:** Only `.png`, `.jpg`, `.jpeg`, and `.webp` are allowed.
  * **Magic Bytes Check:** The backend must parse the file headers (magic bytes) and verify that the MIME type corresponds exactly to the whitelisted image headers (protecting against disguised executable files).
  * **Key Generation:** File storage keys are generated using random UUID-based identifiers. Raw client filenames are discarded.
  * **Sanity Gate:** Invalid files must be rejected immediately and never written to permanent storage or accepted as valid incident media.

---

## 5. Network & Server Security
* **[Confirmed Requirement]** Helmet middleware is enabled on Express to configure standard secure HTTP headers (HSTS, Content Security Policy, X-Frame-Options).
* **[Confirmed Requirement]** Cross-Origin Resource Sharing (CORS) is configured on the backend. In production, credentials-allowed connections are restricted to recognized domain names (wildcard `*` origins are rejected).
* **[Confirmed Requirement]** Rate limiting must be implemented on the backend to protect routes from brute-force and resource-exhaustion attacks. The exact thresholds are configurable and will be finalized during implementation and testing.
* **[Engineering Decision]** Initial engineering default rate limits (subject to adjustment during testing) will be configured as:
  * Login/Signup: Max 5 requests per 15 minutes.
  * Incident Submission: Max 10 requests per 15 minutes.
  * General public endpoints: Max 100 requests per 15 minutes.

---

## 6. Secrets & Keys Governance
* **[Confirmed Requirement]** The Google Gemini API key must remain server-side. S3/MinIO credentials and API secrets must never be exposed to the browser.
* **[Confirmed Requirement]** Environment variables must load from a git-ignored `.env` file on start. `.env.example` documents setup details without containing active secrets.

---

## 7. Database & Auditing Security
* **[Confirmed Requirement]** Database queries must use parameterized/prepared query mechanisms provided by the selected data-access implementation. Raw user-controlled string concatenation in SQL queries is prohibited.
* **[Confirmed Requirement]** Critical actions (role modifications, final verification decisions, alerts, shelter capacity changes) write audit metadata logs to the `audit_logs` table. Audit logs must never log raw credentials or tokens.

---

## 8. Safe Production Errors
* **[Confirmed Requirement]** Stack traces are stripped from production responses. Standard error responses return generic messages and error codes, logging detailed stacks in server logs. See [error-handling.md](file:///d:/DRCH/Docs/error-handling.md).

---

## 9. Security Pre-Flight Checklist
- [ ] Confirm `access_token` and `refresh_token` cookies have `HttpOnly`, `Secure`, and `SameSite=Strict` flags.
- [ ] Verify SHA-256 session token hashing is active.
- [ ] Confirm Helmet policies block clickjacking attempts.
- [ ] Test CORS policies to ensure wildcard origins are blocked.
- [ ] Confirm S3 media uploads require magic bytes checks.
- [ ] Verify that the Google Gemini API key is not referenced in frontend code.
- [ ] Confirm all rate limiters are configured.
