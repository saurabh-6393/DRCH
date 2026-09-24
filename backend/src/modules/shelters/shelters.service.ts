import { query } from '../../db/pool';
import { AppError } from '../../shared/errors';
import {
  CreateShelterInput,
  UpdateCapacityInput,
  ShelterItem,
} from './shelters.types';

/**
 * Searches for operational shelters within radiusMeters (default 50,000 meters / 50km).
 * Sorted by distance in meters (ASC) and available capacity (DESC).
 */
export async function getSheltersProximity(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50000
): Promise<ShelterItem[]> {
  const sql = `
    SELECT 
      s.id,
      s.name,
      s.managing_org_id,
      ST_X(s.location::geometry) AS lng,
      ST_Y(s.location::geometry) AS lat,
      s.capacity,
      s.available_capacity,
      s.status,
      ST_Distance(
        s.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) AS distance_meters
    FROM shelters s
    WHERE s.status = 'OPERATIONAL'
      AND s.available_capacity > 0
      AND ST_DWithin(
        s.location::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $3
      )
    ORDER BY distance_meters ASC, s.available_capacity DESC;
  `;

  const result = await query(sql, [longitude, latitude, radiusMeters]);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    location: {
      lat: Number(row.lat),
      lng: Number(row.lng),
    },
    capacity: Number(row.capacity),
    availableCapacity: Number(row.available_capacity),
    status: row.status,
    distanceMeters: Math.round(Number(row.distance_meters)),
    managingOrgId: row.managing_org_id || null,
  }));
}

export async function createShelter(input: CreateShelterInput) {
  const id = crypto.randomUUID();
  const sql = `
    INSERT INTO shelters (id, managing_org_id, name, location, capacity, available_capacity, status, created_at, updated_at)
    VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6, $6, 'OPERATIONAL', NOW(), NOW())
    RETURNING id, name, capacity, available_capacity, status, created_at
  `;

  const result = await query(sql, [
    id,
    input.managingOrgId || null,
    input.name,
    input.longitude,
    input.latitude,
    input.capacity,
  ]);

  return result.rows[0];
}

export async function updateShelterCapacity(
  shelterId: string,
  input: UpdateCapacityInput
) {
  // Check shelter exists and capacity bounds
  const checkRes = await query(`SELECT capacity FROM shelters WHERE id = $1`, [shelterId]);
  if (checkRes.rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Shelter not found.');
  }

  const totalCapacity = Number(checkRes.rows[0].capacity);
  if (input.availableCapacity > totalCapacity) {
    throw new AppError(
      400,
      'VALIDATION_FAILED',
      'Available capacity cannot exceed total shelter capacity.'
    );
  }

  const status = input.status || (input.availableCapacity === 0 ? 'FULL' : 'OPERATIONAL');

  const updateSql = `
    UPDATE shelters
    SET available_capacity = $1, status = $2, updated_at = NOW()
    WHERE id = $3
    RETURNING id, name, capacity, available_capacity, status, updated_at
  `;

  const result = await query(updateSql, [input.availableCapacity, status, shelterId]);
  return result.rows[0];
}
