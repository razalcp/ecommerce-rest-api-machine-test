import { z } from 'zod';

const emailSchema = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .email('Email must be a valid email address');

export const registerSchema = z.strictObject({
  fullName: z
    .string({ error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters long')
    .max(100, 'Full name must be at most 100 characters long'),
  email: emailSchema,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .refine(
      (password) => Buffer.byteLength(password, 'utf8') <= 72,
      'Password must not exceed 72 UTF-8 bytes'
    ),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z.strictObject({
  refreshToken: z
    .string({ error: 'Refresh token is required' })
    .min(1, 'Refresh token is required'),
});
