import client from './client';

export interface Shelter {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  capacity: number;
  availableCapacity: number;
  status: string;
  distanceMeters: number;
  managingOrgId: string | null;
}

export interface PublicVerifiedIncident {
  id: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  status: string;
  severity: string;
  createdAt: string;
}

export async function getSheltersProximity(
  latitude: number,
  longitude: number,
  radiusMeters: number = 50000
): Promise<Shelter[]> {
  const response = await client.get<{ ok: boolean; data: Shelter[] }>(
    '/api/v1/shelters/proximity',
    {
      params: { latitude, longitude, radiusMeters },
    }
  );
  return response.data.data;
}

export async function getPublicVerifiedIncidents(category?: string): Promise<PublicVerifiedIncident[]> {
  const response = await client.get<{ ok: boolean; data: PublicVerifiedIncident[] }>(
    '/api/v1/incidents/public',
    {
      params: { category },
    }
  );
  return response.data.data;
}
