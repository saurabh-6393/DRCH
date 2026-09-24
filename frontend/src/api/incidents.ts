import client from './client';

export interface IncidentMedia {
  id: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AiVerificationData {
  confidenceScore: number;
  consistencyResult: boolean;
  detectedAnomalies: string[];
  explanation: string;
  verificationPriority: 'LOW' | 'NORMAL' | 'EXPEDITED' | 'AI_UNAVAILABLE';
  advisorySeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
}

export interface IncidentReport {
  id: string;
  category: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  severity: string;
  createdAt: string;
  media: IncidentMedia;
  aiVerification: AiVerificationData;
}

export interface SubmitIncidentInput {
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  file: File;
}

export async function submitIncident(input: SubmitIncidentInput): Promise<IncidentReport> {
  const formData = new FormData();
  formData.append('category', input.category);
  formData.append('description', input.description);
  formData.append('latitude', input.latitude.toString());
  formData.append('longitude', input.longitude.toString());
  formData.append('media', input.file);

  const response = await client.post<{ ok: boolean; data: IncidentReport }>(
    '/api/v1/incidents',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data.data;
}

export async function getMyReports(): Promise<IncidentReport[]> {
  const response = await client.get<{ ok: boolean; data: IncidentReport[] }>(
    '/api/v1/incidents/my-reports'
  );
  return response.data.data;
}
