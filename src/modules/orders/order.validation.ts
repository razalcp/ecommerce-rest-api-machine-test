import { z } from 'zod';

const productIdSchema = z
  .string({ error: 'Product ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Product ID must be a valid MongoDB ObjectId');

const quantitySchema = z
  .number({ error: 'Quantity is required' })
  .int('Quantity must be an integer')
  .positive('Quantity must be greater than zero')
  .max(1000, 'Quantity must not exceed 1000');

const orderItemSchema = z.strictObject({
  productId: productIdSchema,
  quantity: quantitySchema,
});

export const createOrderSchema = z.strictObject({
  items: z
    .array(orderItemSchema, { error: 'Items must be an array' })
    .min(1, 'At least one order item is required')
    .max(50, 'An order must not contain more than 50 item lines'),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;
