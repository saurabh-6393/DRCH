import { z } from 'zod';

export const createShelterSchema = z.object({
  name: z.string().trim().min(1, 'Shelter name is required'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  capacity: z.coerce.number().int().min(0, 'Capacity must be >= 0'),
  managingOrgId: z.string().uuid().optional(),
});

export type CreateShelterInput = z.infer<typeof createShelterSchema>;

export const updateCapacitySchema = z.object({
  availableCapacity: z.coerce.number().int().min(0, 'Available capacity must be >= 0'),
  status: z.enum(['OPERATIONAL', 'FULL', 'CLOSED']).optional(),
});

export type UpdateCapacityInput = z.infer<typeof updateCapacitySchema>;

export interface ShelterItem {
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
