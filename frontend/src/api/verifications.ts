import client from './client';

export interface QueueItem {
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

export async function getVerificationQueue(priority?: string): Promise<QueueItem[]> {
  const response = await client.get<{ ok: boolean; data: QueueItem[] }>(
    '/api/v1/verifications/queue',
    {
      params: { priority },
    }
  );
  return response.data.data;
}

export async function submitReviewRecommendation(
  incidentId: string,
  recommendation: 'VERIFY' | 'REJECT',
  reviewNotes: string
) {
  const response = await client.post<{ ok: boolean; data: any }>(
    `/api/v1/verifications/${incidentId}/review`,
    { recommendation, reviewNotes }
  );
  return response.data.data;
}

export async function submitAuthorityVerification(
  incidentId: string,
  decision: 'VERIFIED' | 'REJECTED',
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
) {
  const response = await client.post<{ ok: boolean; data: any }>(
    `/api/v1/verifications/${incidentId}/verify`,
    { decision, severity }
  );
  return response.data.data;
}
