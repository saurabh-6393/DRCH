import client from './client';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface AlertItem {
  id: string;
  incidentId: string;
  title: string;
  message: string;
  severity: string;
  affectedZone: GeoJSONPolygon;
  status: 'ACTIVE' | 'CANCELLED';
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertPayload {
  incidentId: string;
  title: string;
  message: string;
  affectedZone: GeoJSONPolygon;
  expiresAt?: string;
}

export async function getActiveAlerts(): Promise<AlertItem[]> {
  const response = await client.get<{ ok: boolean; data: AlertItem[] }>('/api/v1/alerts');
  return response.data.data;
}

export async function createAlert(payload: CreateAlertPayload): Promise<AlertItem> {
  const response = await client.post<{ ok: boolean; data: AlertItem }>('/api/v1/alerts', payload);
  return response.data.data;
}

export async function cancelAlert(alertId: string): Promise<AlertItem> {
  const response = await client.put<{ ok: boolean; data: AlertItem }>(`/api/v1/alerts/${alertId}/cancel`);
  return response.data.data;
}
