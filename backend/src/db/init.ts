/**
 * Controlled database initialization script.
 * Run explicitly via: npm run db:init
 *
 * This script:
 * 1. Enables the PostGIS extension.
 * 2. Creates Phase 1 tables (users, roles, user_roles, sessions) with IF NOT EXISTS guards.
 * 3. Seeds the five standard roles idempotently.
 *
 * This does NOT run automatically on application startup.
 * Production schema changes must be handled separately and explicitly.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set. Cannot initialize database.');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const INIT_SQL = `
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- Phase 1 Tables
-- ============================================================

-- users: Authentication credentials and basic profile
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- roles: RBAC privilege tiers (immutable seed data)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- user_roles: Many-to-many join table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles (role_id);

-- sessions: Refresh token metadata for server-side revocation
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  device_metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions (token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);

-- ============================================================
-- Phase 2 Tables
-- ============================================================

-- incidents: Records structured incident reports
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
  severity VARCHAR(50) NOT NULL DEFAULT 'LOW',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON incidents (reporter_id);

-- incident_media: References upload keys for incident photographs
CREATE TABLE IF NOT EXISTS incident_media (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  storage_key VARCHAR(512) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_incident_media_incident_id ON incident_media (incident_id);

-- ai_verifications: Stores automated multimodal consistency check results (1-to-1 latest evaluation)
CREATE TABLE IF NOT EXISTS ai_verifications (
  id UUID PRIMARY KEY,
  incident_id UUID UNIQUE NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  confidence_score DECIMAL(5,2) NOT NULL,
  consistency_result BOOLEAN NOT NULL,
  detected_anomalies JSONB NOT NULL,
  explanation TEXT NOT NULL,
  verification_priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
  advisory_severity VARCHAR(20) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- Phase 3 Tables
-- ============================================================

-- organizations: Generic organization model covering NGOs, relief groups, and authorities
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- human_reviews: Individual review logs and recommendation checks submitted by Volunteers/NGOs
CREATE TABLE IF NOT EXISTS human_reviews (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  recommendation VARCHAR(50) NOT NULL,
  review_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_human_reviews_incident_id ON human_reviews (incident_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_reviewer_id ON human_reviews (reviewer_id);

-- shelters: Physical shelter registry metadata containing capacities and PostGIS locations
CREATE TABLE IF NOT EXISTS shelters (
  id UUID PRIMARY KEY,
  managing_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  location GEOMETRY(Point, 4326) NOT NULL,
  capacity INTEGER NOT NULL,
  available_capacity INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_shelter_capacity CHECK (capacity >= 0 AND available_capacity >= 0 AND available_capacity <= capacity)
);
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters USING GIST (location);

-- ============================================================
-- Phase 4 Tables
-- ============================================================

-- resources: Inventory stashes owned by organizations
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY,
  owner_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resources_owner_org_id ON resources (owner_org_id);

-- resource_allocations: Multi-target resource distribution tracking
CREATE TABLE IF NOT EXISTS resource_allocations (
  id UUID PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity > 0),
  target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('INCIDENT', 'SHELTER', 'ORGANIZATION')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_resource_id ON resource_allocations (resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_allocations_target ON resource_allocations (target_type, target_id);

-- alerts: Geofenced warning alerts attached MUST reference a VERIFIED incident
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(50) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  affected_zone GEOMETRY(Polygon, 4326) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CANCELLED')),
  expires_at TIMESTAMPTZ NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alerts_affected_zone ON alerts USING GIST (affected_zone);
CREATE INDEX IF NOT EXISTS idx_alerts_incident_id ON alerts (incident_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts (status);

-- notifications: In-app delivery audit and read-state history
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- push_subscriptions: Web Push API VAPID endpoints with spatial targeting point
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  last_location GEOMETRY(Point, 4326) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_location ON push_subscriptions USING GIST (last_location);
`;

const STANDARD_ROLES = [
  { name: 'CITIZEN', description: 'Standard citizen user who can submit incident reports.' },
  { name: 'VOLUNTEER', description: 'Volunteer who can review and recommend on incident reports.' },
  { name: 'NGO', description: 'Non-governmental organization representative with scoped review access.' },
  { name: 'AUTHORITY', description: 'Government authority who can verify/reject incidents and issue alerts.' },
  { name: 'ADMIN', description: 'System administrator with full platform access.' },
];

const SEEDED_ORGANIZATIONS = [
  { name: 'Red Cross Emergency Relief', type: 'NGO', details: { region: 'National' } },
  { name: 'National Disaster Management Authority', type: 'AUTHORITY', details: { level: 'Federal' } },
  { name: 'Community Relief Organization', type: 'RELIEF_PROVIDER', details: { scope: 'Regional' } },
];

async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database initialization...');

    // Execute schema creation
    await client.query(INIT_SQL);
    console.log('✅ Schema tables created (or already exist).');

    // Seed roles idempotently using INSERT ... ON CONFLICT DO NOTHING
    for (const role of STANDARD_ROLES) {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING`,
        [id, role.name, role.description]
      );
    }
    console.log('✅ Standard roles seeded (CITIZEN, VOLUNTEER, NGO, AUTHORITY, ADMIN).');

    // Seed organizations idempotently using INSERT ... ON CONFLICT DO NOTHING
    for (const org of SEEDED_ORGANIZATIONS) {
      const id = crypto.randomUUID();
      await client.query(
        `INSERT INTO organizations (id, name, type, details) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (name) DO NOTHING`,
        [id, org.name, org.type, JSON.stringify(org.details)]
      );
    }
    console.log('✅ Standard organizations seeded.');

    // Verify PostGIS is enabled
    const postgisCheck = await client.query(
      `SELECT PostGIS_Version() AS version`
    );
    console.log(`✅ PostGIS enabled: v${postgisCheck.rows[0].version}`);

    console.log('🎉 Database initialization complete.');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDatabase();
