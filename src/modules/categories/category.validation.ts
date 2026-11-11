import { z } from 'zod';

const categoryNameSchema = z
  .string({ error: 'Category name is required' })
  .trim()
  .min(2, 'Category name must be at least 2 characters long')
  .max(100, 'Category name must be at most 100 characters long');

const categoryIdSchema = z
  .string({ error: 'Category ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Category ID must be a valid MongoDB ObjectId');

const parentCategoryIdSchema = z
  .string({ error: 'Parent category ID must be a string' })
  .regex(/^[a-f\d]{24}$/i, 'Parent category ID must be a valid MongoDB ObjectId');

export const createCategorySchema = z.strictObject({
  name: categoryNameSchema,
  parentId: parentCategoryIdSchema.nullable().optional(),
});

export const updateCategorySchema = z
  .strictObject({
    name: categoryNameSchema.optional(),
    parentId: parentCategoryIdSchema.nullable().optional(),
  })
  .refine((value) => value.name !== undefined || value.parentId !== undefined, {
    message: 'At least one of name or parentId must be provided',
    path: [],
  });

export const categoryIdParamSchema = z.strictObject({
  id: categoryIdSchema,
});
