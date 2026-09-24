import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format.').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  displayName: z.string().min(1, 'Display name is required.').max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format.').transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export interface UserRow {
  [key: string]: unknown;
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SessionRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  token_hash: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  device_metadata: Record<string, unknown> | null;
}
