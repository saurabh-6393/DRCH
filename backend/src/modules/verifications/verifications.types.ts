import { z } from 'zod';

export const submitReviewSchema = z.object({
  recommendation: z.enum(['VERIFY', 'REJECT']),
  reviewNotes: z.string().trim().min(1, 'Review notes are required'),
});

export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const submitVerifySchema = z.object({
  decision: z.enum(['VERIFIED', 'REJECTED']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export type SubmitVerifyInput = z.infer<typeof submitVerifySchema>;

export interface QueueIncidentItem {
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
  aiVerification: {
    verificationPriority: 'EXPEDITED' | 'NORMAL' | 'AI_UNAVAILABLE' | 'LOW';
    advisorySeverity: string | null;
    confidenceScore: number;
    explanation: string;
  };
  reviewCount: number;
}
