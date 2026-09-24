import { z } from 'zod';

export const CreateResourceSchema = z.object({
  ownerOrgId: z.string().uuid().optional().nullable(),
  itemName: z.string().min(2).max(255),
  totalQuantity: z.number().int().min(0),
});

export type CreateResourceInput = z.infer<typeof CreateResourceSchema>;

export const AllocateResourceSchema = z.object({
  allocatedQuantity: z.number().int().min(1),
  targetType: z.enum(['INCIDENT', 'SHELTER', 'ORGANIZATION']),
  targetId: z.string().uuid(),
});

export type AllocateResourceInput = z.infer<typeof AllocateResourceSchema>;

export interface ResourceItem {
  id: string;
  ownerOrgId: string | null;
  itemName: string;
  totalQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceAllocationItem {
  id: string;
  resourceId: string;
  allocatedQuantity: number;
  targetType: 'INCIDENT' | 'SHELTER' | 'ORGANIZATION';
  targetId: string;
  createdAt: string;
  updatedAt: string;
}
