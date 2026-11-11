import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { categoryRepository } from '../categories/category.repository';
import { CategoryDocument } from '../categories/category.types';
import { productRepository } from './product.repository';
import {
  CreateProductInput,
  PaginatedProductResult,
  PRODUCT_STATUSES,
  ProductAdminListQuery,
  ProductDocument,
  ProductRecord,
  PublicPaginatedProductResult,
  PublicProductListQuery,
  SafeProductResponse,
  UpdateProductData,
  UpdateProductInput,
} from './product.types';

const PRODUCT_NOT_FOUND_MESSAGE = 'Product not found';
const CATEGORY_NOT_FOUND_MESSAGE = 'Category not found';
const SKU_ALREADY_EXISTS_MESSAGE = 'A product with this SKU already exists';
const INVALID_SALE_PRICE_MESSAGE = 'Sale price cannot be greater than price';
const UPDATE_PRODUCT_EMPTY_MESSAGE = 'At least one supported product field must be provided';

const normalizeSku = (sku: string): string => sku.trim().toUpperCase();

const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 11000
  );
};

const toSafeProductResponse = (product: ProductRecord): SafeProductResponse => ({
  id: product._id.toString(),
  name: product.name,
  sku: product.sku,
  description: product.description,
  price: product.price,
  salePrice: product.salePrice,
  stock: product.stock,
  category: product.category.toString(),
  status: product.status,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
});

const findProductOrThrow = async (productId: string): Promise<ProductDocument> => {
  const product = await productRepository.findById(productId);

  if (!product) {
    throw new AppError(
      PRODUCT_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'PRODUCT_NOT_FOUND'
    );
  }

  return product;
};

const findCategoryOrThrow = async (categoryId: string): Promise<CategoryDocument> => {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new AppError(
      CATEGORY_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'CATEGORY_NOT_FOUND'
    );
  }

  return category;
};

const resolveCategoryAndDescendantIds = async (
  categoryId: string
): Promise<Types.ObjectId[]> => {
  const category = await findCategoryOrThrow(categoryId);
  const descendants = await categoryRepository.findDescendantsByAncestorId(category._id);

  return [category._id, ...descendants.map((descendant) => descendant._id)];
};

const findActiveProductOrThrow = async (
  productId: string
): Promise<ProductDocument> => {
  const product = await productRepository.findActiveById(productId);

  if (!product) {
    throw new AppError(
      PRODUCT_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'PRODUCT_NOT_FOUND'
    );
  }

  return product;
};

const validateEffectiveSalePrice = (price: number, salePrice: number | null): void => {
  if (salePrice !== null && salePrice > price) {
    throw new AppError(
      INVALID_SALE_PRICE_MESSAGE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_ERROR'
    );
  }
};

export const createProduct = async (
  input: CreateProductInput
): Promise<SafeProductResponse> => {
  const name = input.name.trim();
  const sku = normalizeSku(input.sku);
  const category = await findCategoryOrThrow(input.category);
  const salePrice = input.salePrice ?? null;

  validateEffectiveSalePrice(input.price, salePrice);

  const existingProduct = await productRepository.findBySku(sku);

  if (existingProduct) {
    throw new AppError(
      SKU_ALREADY_EXISTS_MESSAGE,
      HttpStatus.CONFLICT,
      'SKU_ALREADY_EXISTS'
    );
  }

  try {
    const product = await productRepository.create({
      name,
      sku,
      description: input.description ?? '',
      price: input.price,
      salePrice,
      stock: input.stock,
      category: category._id,
      status: input.status ?? PRODUCT_STATUSES.ACTIVE,
    });

    return toSafeProductResponse(product);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        SKU_ALREADY_EXISTS_MESSAGE,
        HttpStatus.CONFLICT,
        'SKU_ALREADY_EXISTS'
      );
    }

    throw error;
  }
};

export const getProductById = async (
  productId: string
): Promise<SafeProductResponse> => {
  const product = await findProductOrThrow(productId);
  return toSafeProductResponse(product);
};

export const getPublicProducts = async (
  query: PublicProductListQuery
): Promise<PublicPaginatedProductResult<SafeProductResponse>> => {
  const { page, limit, sortBy, sortOrder, categoryId, ...filters } = query;
  const categoryIds = categoryId
    ? await resolveCategoryAndDescendantIds(categoryId)
    : undefined;
  const result = await productRepository.findActiveProducts(
    { ...filters, categoryIds },
    { page, limit },
    { sortBy, sortOrder }
  );

  return {
    products: result.products.map(toSafeProductResponse),
    pagination: result.pagination,
  };
};

export const getPublicProductById = async (
  productId: string
): Promise<SafeProductResponse> => {
  const product = await findActiveProductOrThrow(productId);
  return toSafeProductResponse(product);
};

export const listAdminProducts = async (
  query: ProductAdminListQuery
): Promise<PaginatedProductResult<SafeProductResponse>> => {
  const { page, limit, ...filters } = query;
  const result = await productRepository.findAllAdmin(filters, { page, limit });

  return {
    ...result,
    products: result.products.map(toSafeProductResponse),
  };
};

export const updateProduct = async (
  productId: string,
  input: UpdateProductInput
): Promise<SafeProductResponse> => {
  const product = await findProductOrThrow(productId);
  const updateData: UpdateProductData = {};

  if (input.sku !== undefined) {
    const sku = normalizeSku(input.sku);
    const duplicateProduct = await productRepository.findBySkuExcludingId(
      sku,
      product._id
    );

    if (duplicateProduct) {
      throw new AppError(
        SKU_ALREADY_EXISTS_MESSAGE,
        HttpStatus.CONFLICT,
        'SKU_ALREADY_EXISTS'
      );
    }

    updateData.sku = sku;
  }

  if (input.category !== undefined) {
    const category = await findCategoryOrThrow(input.category);
    updateData.category = category._id;
  }

  if (input.name !== undefined) {
    updateData.name = input.name.trim();
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.price !== undefined) {
    updateData.price = input.price;
  }

  if (input.salePrice !== undefined) {
    updateData.salePrice = input.salePrice;
  }

  if (input.stock !== undefined) {
    updateData.stock = input.stock;
  }

  if (input.status !== undefined) {
    updateData.status = input.status;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      UPDATE_PRODUCT_EMPTY_MESSAGE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_ERROR'
    );
  }

  const effectivePrice = updateData.price ?? product.price;
  const effectiveSalePrice =
    input.salePrice !== undefined ? input.salePrice : product.salePrice;

  validateEffectiveSalePrice(effectivePrice, effectiveSalePrice);

  try {
    const updatedProduct = await productRepository.updateById(product._id, updateData);

    if (!updatedProduct) {
      throw new AppError(
        PRODUCT_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
        'PRODUCT_NOT_FOUND'
      );
    }

    return toSafeProductResponse(updatedProduct);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        SKU_ALREADY_EXISTS_MESSAGE,
        HttpStatus.CONFLICT,
        'SKU_ALREADY_EXISTS'
      );
    }

    throw error;
  }
};

export const deleteProduct = async (
  productId: string
): Promise<SafeProductResponse> => {
  const product = await findProductOrThrow(productId);
  const updatedProduct = await productRepository.setInactiveById(product._id);

  if (!updatedProduct) {
    throw new AppError(
      PRODUCT_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'PRODUCT_NOT_FOUND'
    );
  }

  return toSafeProductResponse(updatedProduct);
};
