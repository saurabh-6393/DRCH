import { z } from 'zod';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'SESSION_REVOKED'
  | 'INCIDENT_VERIFIED'
  | 'INCIDENT_REJECTED'
  | 'ALERT_CREATED'
  | 'ALERT_CANCELLED'
  | 'SHELTER_CAPACITY_UPDATED'
  | 'RESOURCE_ALLOCATED'
  | 'RESOURCE_ALLOCATION_DELETED';

export type AuditTargetType =
  | 'USER'
  | 'SESSION'
  | 'INCIDENT'
  | 'ALERT'
  | 'SHELTER'
  | 'RESOURCE_ALLOCATION';

export interface CreateAuditLogInput {
  action: AuditAction;
  actorId?: string | null;
  targetType: AuditTargetType;
  targetId: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  actorId: string | null;
  targetType: string;
  targetId: string;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .default(20)
    .transform((val) => Math.min(val, 100)),
  action: z.string().optional(),
  targetType: z.string().optional(),
  actorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type AuditQueryParams = z.infer<typeof auditQuerySchema>;
