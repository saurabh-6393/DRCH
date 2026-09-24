import { z } from 'zod';

// Gemini model output schema strictly allows LOW, NORMAL, EXPEDITED
export const geminiResponseSchema = z.object({
  confidenceScore: z.number().min(0).max(1),
  consistencyResult: z.boolean(),
  detectedAnomalies: z.array(z.string()),
  explanation: z.string(),
  verificationPriority: z.enum(['LOW', 'NORMAL', 'EXPEDITED']),
  advisorySeverity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
});

export type GeminiResponse = z.infer<typeof geminiResponseSchema>;

// Full AI verification result stored in server database (includes server-side AI_UNAVAILABLE fallback state)
export interface AiVerificationResult {
  confidenceScore: number;
  consistencyResult: boolean;
  detectedAnomalies: string[];
  explanation: string;
  verificationPriority: 'LOW' | 'NORMAL' | 'EXPEDITED' | 'AI_UNAVAILABLE';
  advisorySeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
}
