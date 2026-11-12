import { z } from 'zod';
import { ORDER_STATUSES } from './order.types';

const productIdSchema = z
  .string({ error: 'Product ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Product ID must be a valid MongoDB ObjectId');

const orderIdSchema = z
  .string({ error: 'Order ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Order ID must be a valid MongoDB ObjectId');

const customerIdSchema = z
  .string({ error: 'Customer ID must be a string' })
  .regex(/^[a-f\d]{24}$/i, 'Customer ID must be a valid MongoDB ObjectId');

const paginationSchema = {
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
};

const orderStatusSchema = z.enum(
  [
    ORDER_STATUSES.PENDING,
    ORDER_STATUSES.CONFIRMED,
    ORDER_STATUSES.PROCESSING,
    ORDER_STATUSES.SHIPPED,
    ORDER_STATUSES.DELIVERED,
    ORDER_STATUSES.CANCELLED,
  ],
  { error: 'Status is not a supported order status' }
);

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

export const orderIdParamSchema = z.strictObject({
  id: orderIdSchema,
});

export const customerOrderListQuerySchema = z.strictObject({
  ...paginationSchema,
});

export const adminOrderListQuerySchema = z.strictObject({
  ...paginationSchema,
  status: orderStatusSchema.optional(),
  customerId: customerIdSchema.optional(),
});

export const updateOrderStatusSchema = z.strictObject({
  status: z.enum(
    [
      ORDER_STATUSES.CONFIRMED,
      ORDER_STATUSES.PROCESSING,
      ORDER_STATUSES.SHIPPED,
      ORDER_STATUSES.DELIVERED,
      ORDER_STATUSES.CANCELLED,
    ],
    { error: 'Status must be a supported order status other than PENDING' }
  ),
});

export type CreateOrderSchemaInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusSchemaInput = z.infer<typeof updateOrderStatusSchema>;
