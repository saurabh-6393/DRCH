import { z } from 'zod';

export const SubscribePushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
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
