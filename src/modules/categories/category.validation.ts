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

export const updateCategorySchema = z.strictObject({
  name: categoryNameSchema,
});

export const categoryIdParamSchema = z.strictObject({
  id: categoryIdSchema,
});
