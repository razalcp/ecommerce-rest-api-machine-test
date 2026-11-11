import { z } from 'zod';
import {
  PRODUCT_SORT_FIELDS,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
} from './product.types';

const hasAtMostTwoDecimalPlaces = (value: number): boolean =>
  Number(value.toFixed(2)) === value;

const productNameSchema = z
  .string({ error: 'Product name is required' })
  .trim()
  .min(2, 'Product name must be at least 2 characters long')
  .max(150, 'Product name must be at most 150 characters long');

const skuSchema = z
  .string({ error: 'SKU is required' })
  .trim()
  .min(2, 'SKU must be at least 2 characters long')
  .max(50, 'SKU must be at most 50 characters long');

const descriptionSchema = z
  .string({ error: 'Description must be a string' })
  .trim()
  .max(2000, 'Description must be at most 2000 characters long');

const priceSchema = z
  .number({ error: 'Price is required' })
  .finite('Price must be a finite number')
  .positive('Price must be greater than zero')
  .refine(
    hasAtMostTwoDecimalPlaces,
    'Price must have at most two decimal places'
  );

const salePriceSchema = z
  .number({ error: 'Sale price must be a number' })
  .finite('Sale price must be a finite number')
  .positive('Sale price must be greater than zero')
  .refine(
    hasAtMostTwoDecimalPlaces,
    'Sale price must have at most two decimal places'
  );

const stockSchema = z
  .number({ error: 'Stock is required' })
  .int('Stock must be an integer')
  .min(0, 'Stock cannot be negative');

const categoryIdSchema = z
  .string({ error: 'Category ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Category ID must be a valid MongoDB ObjectId');

const productStatusSchema = z.enum(
  [PRODUCT_STATUSES.ACTIVE, PRODUCT_STATUSES.INACTIVE],
  { error: 'Status must be either ACTIVE or INACTIVE' }
);

const productIdSchema = z
  .string({ error: 'Product ID is required' })
  .regex(/^[a-f\d]{24}$/i, 'Product ID must be a valid MongoDB ObjectId');

export const createProductSchema = z.strictObject({
  name: productNameSchema,
  sku: skuSchema,
  description: descriptionSchema.optional(),
  price: priceSchema,
  salePrice: salePriceSchema.nullable().optional(),
  stock: stockSchema,
  category: categoryIdSchema,
  status: productStatusSchema.optional(),
});

export const updateProductSchema = z
  .strictObject({
    name: productNameSchema.optional(),
    sku: skuSchema.optional(),
    description: descriptionSchema.optional(),
    price: priceSchema.optional(),
    salePrice: salePriceSchema.nullable().optional(),
    stock: stockSchema.optional(),
    category: categoryIdSchema.optional(),
    status: productStatusSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one supported product field must be provided',
    path: [],
  });

export const productAdminListQuerySchema = z.strictObject({
  status: productStatusSchema.optional(),
  category: categoryIdSchema.optional(),
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

const minPriceQuerySchema = z.coerce
  .number({ error: 'minPrice must be a number' })
  .finite('minPrice must be a finite number')
  .nonnegative('minPrice cannot be negative')
  .refine(
    hasAtMostTwoDecimalPlaces,
    'minPrice must have at most two decimal places'
  );

const maxPriceQuerySchema = z.coerce
  .number({ error: 'maxPrice must be a number' })
  .finite('maxPrice must be a finite number')
  .nonnegative('maxPrice cannot be negative')
  .refine(
    hasAtMostTwoDecimalPlaces,
    'maxPrice must have at most two decimal places'
  );

export const publicProductListQuerySchema = z
  .strictObject({
    search: z
      .string({ error: 'Search must be a string' })
      .trim()
      .max(100, 'Search must be at most 100 characters long')
      .optional(),
    categoryId: categoryIdSchema.optional(),
    minPrice: minPriceQuerySchema.optional(),
    maxPrice: maxPriceQuerySchema.optional(),
    sortBy: z
      .enum(
        [
          PRODUCT_SORT_FIELDS.CREATED_AT,
          PRODUCT_SORT_FIELDS.NAME,
          PRODUCT_SORT_FIELDS.PRICE,
        ],
        { error: 'sortBy must be one of createdAt, name, or price' }
      )
      .default(PRODUCT_SORT_FIELDS.CREATED_AT),
    sortOrder: z
      .enum([PRODUCT_SORT_ORDERS.ASC, PRODUCT_SORT_ORDERS.DESC], {
        error: 'sortOrder must be either asc or desc',
      })
      .default(PRODUCT_SORT_ORDERS.DESC),
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
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: 'minPrice cannot be greater than maxPrice',
      path: ['minPrice'],
    }
  );

export const productIdParamSchema = z.strictObject({
  id: productIdSchema,
});
