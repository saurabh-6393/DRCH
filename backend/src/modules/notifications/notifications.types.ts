import { z } from 'zod';

/**
 * Validates that a string is valid Base64 / Base64url and decodes to expectedByteLength.
 */
export function isValidBase64OfLength(str: string, expectedByteLength: number): boolean {
  if (typeof str !== 'string' || str.trim().length === 0) return false;
  try {
    // Permit standard Base64 and Base64url characters
    if (!/^[A-Za-z0-9+/=_-]+$/.test(str)) {
      return false;
    }
    const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
    const buf = Buffer.from(normalized, 'base64');
    return buf.length === expectedByteLength;
  } catch {
    return false;
  }
}

export const SubscribePushSchema = z.object({
  endpoint: z
    .string()
    .url('Endpoint must be a valid URL')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          if (process.env.NODE_ENV === 'production') {
            return parsed.protocol === 'https:';
          }
          return (
            parsed.protocol === 'https:' ||
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1'
          );
        } catch {
          return false;
        }
      },
      { message: 'Endpoint must be a valid HTTPS URL (or localhost in non-production)' }
    ),
  keys: z.object({
    p256dh: z
      .string()
      .refine((val) => isValidBase64OfLength(val, 65), {
        message: 'p256dh key must be a valid Base64-encoded string (65 bytes decoded)',
      }),
    auth: z
      .string()
      .refine((val) => isValidBase64OfLength(val, 16), {
        message: 'auth key must be a valid Base64-encoded authentication secret (16 bytes decoded)',
      }),
  }),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export type SubscribePushInput = z.infer<typeof SubscribePushSchema>;

export const UpdateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

export interface NotificationItem {
  id: string;
  userId: string;
  alertId: string | null;
  title: string;
  body: string;
  data: any | null;
  readAt: string | null;
  createdAt: string;
}
