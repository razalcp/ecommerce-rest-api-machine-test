import { z } from 'zod';
import { USER_ROLES } from './user.types';

const objectIdSchema = z
  .string({ error: 'User ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'User ID must be a valid MongoDB ObjectId');

const booleanQuerySchema = z
  .enum(['true', 'false'], { error: 'isActive must be either true or false' })
  .transform((value) => value === 'true');

export const userIdParamSchema = z.strictObject({
  id: objectIdSchema,
});

export const updateProfileSchema = z.strictObject({
  fullName: z
    .string({ error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters long')
    .max(100, 'Full name must be at most 100 characters long'),
});

export const updateUserStatusSchema = z.strictObject({
  isActive: z.boolean({ error: 'isActive must be a boolean' }),
});

export const listUsersQuerySchema = z.strictObject({
  search: z
    .string({ error: 'Search must be a string' })
    .trim()
    .max(100, 'Search must be at most 100 characters long')
    .optional(),
  role: z
    .enum([USER_ROLES.ADMIN, USER_ROLES.CUSTOMER], {
      error: 'Role must be either ADMIN or CUSTOMER',
    })
    .optional(),
  isActive: booleanQuerySchema.optional(),
  page: z.coerce
    .number({ error: 'Page must be a number' })
    .int('Page must be an integer')
    .positive('Page must be a positive integer')
    .default(1),
  limit: z.coerce
    .number({ error: 'Limit must be a number' })
    .int('Limit must be an integer')
    .positive('Limit must be a positive integer')
    .max(50, 'Limit must not exceed 50')
    .default(10),
});
