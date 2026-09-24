# Database Design

> Conceptual database model documentation for the PostgreSQL + PostGIS database configuration.

---

## 1. System Entity Conventions
* **Primary Keys:** Every table must use a UUID primary key. The exact UUID generation mechanism (e.g. database-side function or application-side library) will be finalized during migration implementation; no unnecessary PostgreSQL extensions are locked in at this stage.
* **Timestamps:** All mutable/domain tables must include `created_at` and `updated_at` using `timestamptz`. Immutable event/log/junction tables may use `created_at` only where appropriate.
- **Naming:** Lowercase table names, snake_case column names.
- **Indexes:** Indexes must be created on foreign keys, lookups, and spatial geometry fields.

---

## 2. Entity Specifications

### 2.1 users
* **Purpose:** Stores user authentication credentials and basic profile details.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `email` VARCHAR(255) UNIQUE NOT NULL (indexed, lowercased)
  * `password_hash` VARCHAR(255) NOT NULL
  * `display_name` VARCHAR(255) NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Constraints:** Email must be a valid email format.

### 2.2 roles
* **Purpose:** Defines RBAC privilege tiers.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `name` VARCHAR(50) UNIQUE NOT NULL (CITIZEN, VOLUNTEER, NGO, AUTHORITY, ADMIN)
  * `description` TEXT
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.3 user_roles
* **Purpose:** Many-to-many join table mapping users to roles.
* **Fields:**
  * `user_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE CASCADE
  * `role_id` UUID FOREIGN KEY REFERENCES `roles(id)` ON DELETE CASCADE
* **Constraints:** Composite primary key (`user_id`, `role_id`).

### 2.4 sessions (Session/Refresh Token Metadata)
* **Purpose:** Tracks active refresh tokens and permits server-side revocation without storing raw secrets.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `user_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE CASCADE
  * `token_hash` VARCHAR(255) UNIQUE NOT NULL (SHA-256 hash of refresh token)
  * `issued_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `expires_at` TIMESTAMPTZ NOT NULL
  * `revoked_at` TIMESTAMPTZ NULL (session is invalid if not null)
  * `device_metadata` JSONB NULL (stores controlled device/session metadata such as browser and OS; arbitrary IP storage inside this field is not a requirement and any IP security logging must follow the standard security/audit logging policy)
* **Indexes:** Index on `token_hash`.

### 2.5 organizations
* **Purpose:** Generic organization model covering NGOs, relief groups, and authorities.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `name` VARCHAR(255) NOT NULL
  * `type` VARCHAR(50) NOT NULL (NGO, RELIEF_PROVIDER, AUTHORITY)
  * `details` JSONB NULL (scope geometries, configurations)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.6 incidents
* **Purpose:** Records incident reports submitted by citizens.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `reporter_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE SET NULL (nullable)
  * `category` VARCHAR(50) NOT NULL (FLOOD, FIRE, EARTHQUAKE, etc.)
  * `description` TEXT NOT NULL
  * `location` GEOMETRY(Point, 4326) NOT NULL (PostGIS Point)
  * `status` VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' (SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED)
  * `severity` VARCHAR(50) NOT NULL DEFAULT 'LOW' (LOW, MEDIUM, HIGH, CRITICAL)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Indexes:** GiST spatial index on `location`.

### 2.7 incident_media
* **Purpose:** References upload keys for incident photographs.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `incident_id` UUID FOREIGN KEY REFERENCES `incidents(id)` ON DELETE CASCADE
  * `storage_key` VARCHAR(512) NOT NULL (S3 storage key reference path)
  * `mime_type` VARCHAR(100) NOT NULL
  * `size_bytes` INTEGER NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.8 ai_verifications
* **Purpose:** Stores the automated consistency check result for submitted incidents. The MVP maintains a 1-to-1 relationship between incidents and `ai_verifications`, storing only the latest AI evaluation for each incident. No AI evaluation history logs are maintained.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `incident_id` UUID UNIQUE FOREIGN KEY REFERENCES `incidents(id)` ON DELETE CASCADE
  * `confidence_score` DECIMAL(5,2) NOT NULL
  * `consistency_result` BOOLEAN NOT NULL
  * `detected_anomalies` JSONB NOT NULL (array of detected mismatch parameters)
  * `explanation` TEXT NOT NULL
  * `verification_priority` VARCHAR(20) NOT NULL DEFAULT 'NORMAL' (LOW, NORMAL, EXPEDITED, AI_UNAVAILABLE)
  * `advisory_severity` VARCHAR(20) NULL (LOW, MEDIUM, HIGH, CRITICAL; generated by AI, advisory only, NOT the authoritative severity)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Constraints:** 
  * 1-to-1 mapping via unique constraint on `incident_id`.
  * `advisory_severity` is generated by the AI and is advisory only. It is NOT the authoritative incident severity, and the Authority controls the final incident severity. `incidents.severity` remains the sole authoritative incident severity field, controlled and set exclusively by the Authority.

### 2.9 human_reviews
* **Purpose:** Stores individual review logs and recommendation checks submitted by Volunteers and NGOs.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `incident_id` UUID FOREIGN KEY REFERENCES `incidents(id)` ON DELETE CASCADE
  * `reviewer_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE SET NULL
  * `recommendation` VARCHAR(50) NOT NULL (VERIFY, REJECT)
  * `review_notes` TEXT NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.10 shelters
* **Purpose:** Physical registry metadata containing capacities.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `managing_org_id` UUID FOREIGN KEY REFERENCES `organizations(id)` ON DELETE SET NULL
  * `name` VARCHAR(255) NOT NULL
  * `location` GEOMETRY(Point, 4326) NOT NULL (PostGIS Point)
  * `capacity` INTEGER NOT NULL
  * `available_capacity` INTEGER NOT NULL
  * `status` VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL' (OPERATIONAL, FULL, CLOSED)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Constraints:** `available_capacity` <= `capacity`, and both must be >= 0.
* **Indexes:** GiST spatial index on `location`.

### 2.11 resources
* **Purpose:** Logs resource items.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `owner_org_id` UUID FOREIGN KEY REFERENCES `organizations(id)` ON DELETE SET NULL
  * `item_name` VARCHAR(255) NOT NULL
  * `total_quantity` INTEGER NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Constraints:** `total_quantity` >= 0.

### 2.12 resource_allocations
* **Purpose:** Tracks allocation of resources to targets (incidents, shelters, organizations).
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `resource_id` UUID FOREIGN KEY REFERENCES `resources(id)` ON DELETE CASCADE
  * `allocated_quantity` INTEGER NOT NULL
  * `target_type` VARCHAR(50) NOT NULL (e.g., 'incident', 'shelter', 'organization')
  * `target_id` UUID NOT NULL (validated at the service/application layer as a polymorphic reference; no database-level foreign key is created on this column)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  * `updated_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Constraints:** `allocated_quantity` > 0. Sum of allocations for a resource must not exceed its `total_quantity`.

### 2.13 alerts
* **Purpose:** Records geofenced alert warnings.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `incident_id` UUID FOREIGN KEY REFERENCES `incidents(id)` ON DELETE SET NULL
  * `title` VARCHAR(255) NOT NULL
  * `message` TEXT NOT NULL
  * `affected_zone` GEOMETRY(Polygon, 4326) NOT NULL (PostGIS Polygon)
  * `expires_at` TIMESTAMPTZ NULL (advisory expiration; no default TTL is locked yet)
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
* **Indexes:** GiST spatial index on `affected_zone`.

### 2.14 notifications
* **Purpose:** Records notification delivery histories.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `user_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE CASCADE
  * `title` VARCHAR(255) NOT NULL
  * `body` TEXT NOT NULL
  * `sent_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.15 push_subscriptions
* **Purpose:** Stores client browser Web Push VAPID keys.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `user_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE CASCADE
  * `endpoint_details` JSONB NOT NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

### 2.16 audit_logs
* **Purpose:** Tracks administrative and lifecycle actions.
* **Fields:**
  * `id` UUID PRIMARY KEY
  * `user_id` UUID FOREIGN KEY REFERENCES `users(id)` ON DELETE SET NULL
  * `action` VARCHAR(100) NOT NULL (role changes, final verification decisions, alerts creation)
  * `details` JSONB NULL
  * `created_at` TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP

---

## 3. Relationships & Cardinality

* **Incident to AI Verification (1-to-1):** Every incident has at most one automated consistency log stored in `ai_verifications`, representing the latest AI check.
* **Incident to Human Reviews (1-to-Many):** Multiple human reviewers (Volunteers/NGOs) can review and record recommendations in `human_reviews` before final Authority verification.
* **Resource to Multiple Allocations (1-to-Many):** A resource line items row (e.g. general water bottles stash) can allocate portions of its quantity to multiple incidents or shelters via separate `resource_allocations` rows.
* **Organization to Shelters/Resources (1-to-Many):** A managing organization controls multiple shelters and registers multiple resources.
* **User to Roles (Many-to-Many):** Map users and roles through the `user_roles` join table.
* **User to Sessions (1-to-Many):** A user can have multiple concurrent active sessions/refresh token entries on different devices.
