import { z } from 'zod';

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export const GeoJSONPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))).min(1),
});

export const CreateAlertSchema = z.object({
  incidentId: z.string().uuid(),
  title: z.string().min(3).max(255),
  message: z.string().min(5),
  affectedZone: GeoJSONPolygonSchema,
  expiresAt: z.string().datetime().optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;

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
