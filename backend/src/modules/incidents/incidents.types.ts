import { z } from 'zod';

export const createIncidentSchema = z.object({
  category: z.string().trim().min(1, 'Category is required'),
  description: z.string().trim().min(1, 'Description is required'),
  latitude: z.coerce.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.coerce.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
});

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export interface IncidentSanitizedMedia {
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface IncidentSanitizedAiVerification {
  confidenceScore: number;
  consistencyResult: boolean;
  detectedAnomalies: string[];
  explanation: string;
  verificationPriority: string;
  advisorySeverity: string | null;
}

export interface IncidentResponseData {
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
  media: IncidentSanitizedMedia;
  aiVerification: IncidentSanitizedAiVerification;
}
