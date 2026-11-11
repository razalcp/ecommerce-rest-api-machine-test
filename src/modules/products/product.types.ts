import { HydratedDocument, Types } from 'mongoose';

export const PRODUCT_STATUSES = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[keyof typeof PRODUCT_STATUSES];

export const PRODUCT_SORT_FIELDS = {
  CREATED_AT: 'createdAt',
  NAME: 'name',
  PRICE: 'price',
} as const;

export type ProductSortField =
  (typeof PRODUCT_SORT_FIELDS)[keyof typeof PRODUCT_SORT_FIELDS];

export const PRODUCT_SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export type ProductSortOrder =
  (typeof PRODUCT_SORT_ORDERS)[keyof typeof PRODUCT_SORT_ORDERS];

export interface Product {
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: number;
  category: Types.ObjectId;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProductDocument = HydratedDocument<Product>;
export type ProductRecord = Product & { _id: Types.ObjectId };
export type ProductId = string | Types.ObjectId;

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  stock: number;
  category: string;
  status?: ProductStatus;
}

export interface CreateProductData {
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: number;
  category: Types.ObjectId;
  status: ProductStatus;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string;
  price?: number;
  salePrice?: number | null;
  stock?: number;
  category?: string;
  status?: ProductStatus;
}

export interface UpdateProductData {
  name?: string;
  sku?: string;
  description?: string;
  price?: number;
  salePrice?: number | null;
  stock?: number;
  category?: Types.ObjectId;
  status?: ProductStatus;
}

export interface ProductAdminFilters {
  status?: ProductStatus;
  category?: string;
}

export interface ProductPagination {
  page: number;
  limit: number;
}

export type ProductAdminListQuery = ProductAdminFilters & ProductPagination;

export interface PublicProductFilters {
  search?: string;
  categoryIds?: Types.ObjectId[];
  minPrice?: number;
  maxPrice?: number;
}

export interface ProductSorting {
  sortBy: ProductSortField;
  sortOrder: ProductSortOrder;
}

export interface PublicProductListQuery {
  search?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy: ProductSortField;
  sortOrder: ProductSortOrder;
  page: number;
  limit: number;
}

export interface PublicProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicPaginatedProductResult<TProduct = ProductRecord> {
  products: TProduct[];
  pagination: PublicProductPagination;
}

export interface SafeProductResponse {
  id: string;
  name: string;
  sku: string;
  description: string;
  price: number;
  salePrice: number | null;
  stock: number;
  category: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedProductResult<TProduct = ProductDocument> {
  products: TProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductRepository {
  create(productData: CreateProductData): Promise<ProductDocument>;
  findById(productId: ProductId): Promise<ProductDocument | null>;
  findBySku(sku: string): Promise<ProductDocument | null>;
  findBySkuExcludingId(
    sku: string,
    productId: ProductId
  ): Promise<ProductDocument | null>;
  updateById(
    productId: ProductId,
    updateData: UpdateProductData
  ): Promise<ProductDocument | null>;
  setInactiveById(productId: ProductId): Promise<ProductDocument | null>;
  findAllAdmin(
    filters: ProductAdminFilters,
    pagination: ProductPagination
  ): Promise<PaginatedProductResult>;
  findActiveProducts(
    filters: PublicProductFilters,
    pagination: ProductPagination,
    sorting: ProductSorting
  ): Promise<PublicPaginatedProductResult>;
  findActiveById(productId: ProductId): Promise<ProductDocument | null>;
  existsByCategoryId(categoryId: ProductId): Promise<boolean>;
}
