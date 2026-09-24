# Error Handling

> Standardized guidelines for error classifications, API response formats, logging standards, and fallback behaviors.

---

## 1. Standard API Response Structure
* **[Confirmed Requirement]** All backend routes must return a consistent JSON response shape.
* **Success Output:**
  ```json
  {
    "ok": true,
    "data": {
      "id": "uuid-details"
    }
  }
  ```
* **Error Output:**
  ```json
  {
    "ok": false,
    "error": {
      "code": "ERROR_CODE",
      "message": "A client-friendly warning message describing what happened.",
      "details": [] // Array containing additional context, e.g. details of validation errors
    }
  }
  ```

---

## 2. HTTP Status & Error Code Map
* **[Confirmed Requirement]** The application uses the following standard HTTP statuses and application codes:

| HTTP Status | Application Error Code | Context |
| :--- | :--- | :--- |
| **400** | `VALIDATION_FAILED` | Input fields failed server-side validation. |
| **401** | `UNAUTHENTICATED` | Missing, expired, or invalid cookie sessions. |
| **403** | `FORBIDDEN` | RBAC blocks access. |
| **404** | `NOT_FOUND` | Resource does not exist. |
| **409** | `CONFLICT` | Key duplicate, e.g. email already registered. |
| **429** | `RATE_LIMITED` | Request threshold limit exceeded. |
| **500** | `INTERNAL_SERVER_ERROR` | Unhandled database exceptions or server crashes. |
| **502** | `AI_PROVIDER_ERROR` | External Gemini API checks timed out or failed. |
| **502** | `STORAGE_PROVIDER_ERROR` | Storage provider rejected or failed to persist the validated media object. |
| **502** | `MAP_PROVIDER_ERROR` | Mapbox routing calculations failed. |

---

## 3. Fallback Behaviors for External Service Outages
* **[Confirmed Requirement]** Critical disaster workflows must fail gracefully when external APIs are offline.

### 3.1 AI Verification Outage (Google Gemini)
* **Behavior:** If the Gemini API check fails or times out, the incident submission must not be blocked.
* **Fallback Action:** The server performs the following workflow:
  1. Saves the incident record to the database in `SUBMITTED` status.
  2. Transitions the incident status to `UNDER_REVIEW` as backend validation/AI processing begins. The citizen submission endpoint may return `201 Created` while the incident is transitioning into `UNDER_REVIEW`.
  3. Creates/updates the corresponding AI verification record (`ai_verifications` table) with the `verification_priority` set to `AI_UNAVAILABLE` and the `advisory_severity` set to `NULL`. Gemini availability does not determine whether human review occurs.
  4. Routes the incident to the human review queue, ensuring human review remains available.
  5. The Authority makes the final `VERIFIED` or `REJECTED` decision.
* **AI Provider Error Usage:** The `AI_PROVIDER_ERROR` error code and 502 status must only be returned by endpoints whose operations specifically require a working AI provider to proceed (such as explicit manual AI re-evaluation requests). It must not be returned during citizen report submissions.

### 3.2 Maps Outage (Mapbox)
* **Behavior:** If Mapbox map tiles or routing calculations fail, the incident submission, verification queue, and alerts broadcast pipelines must continue.
* **Fallback Action:** The client displays coordinates in plain text and lists nearby shelters by straight-line distance. The system must explicitly state that straight-line proximity is not equivalent to road routing, and that road/turn-by-turn routing remains unavailable until the map provider recovers. Citizens can copy-paste the plain text coordinates into native mapping applications on their devices.

---

## 4. Backend Logging Guidelines
* **[Confirmed Requirement]** Every error log must record: request ID, timestamp, user context, path, code, and detailed stack trace.
* **[Engineering Decision]** Log entries are written using structured JSON log formats. In development, logs print to the terminal console. In production, logs are redirected to a log aggregation service. No raw PII or tokens must be logged.

---

## 5. Client-Facing Error Messages
* **[Confirmed Requirement]** Client interfaces must display user-friendly error messages based on the application code.
* **Examples:**
  * `VALIDATION_FAILED` $\to$ "Please verify your input details and try again."
  * `UNAUTHENTICATED` $\to$ "Your session has expired. Please log in again."
  * `AI_PROVIDER_ERROR` $\to$ "Automated analysis is currently unavailable. Your report has been routed directly to human dispatchers."

---

## 6. Production vs. Development Behavior
* **[Confirmed Requirement]** Stack traces are stripped from production responses.
* **Development Output:**
  ```json
  {
    "ok": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "database connection timed out",
      "details": ["stack trace array..."]
    }
  }
  ```
* **Production Output:**
  ```json
  {
    "ok": false,
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Something went wrong on the server.",
      "details": []
    }
  }
  ```
