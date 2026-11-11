import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { parseWithSchema } from '../../shared/utils/validation.util';
import {
  createProduct as createProductService,
  deleteProduct as deleteProductService,
  getProductById,
  listAdminProducts as listAdminProductsService,
  updateProduct as updateProductService,
} from './product.service';
import {
  CreateProductInput,
  PaginatedProductResult,
  ProductAdminListQuery,
  SafeProductResponse,
  UpdateProductInput,
} from './product.types';
import {
  productAdminListQuerySchema,
  productIdParamSchema,
} from './product.validation';

export const createProduct = async (
  req: Request<{}, {}, CreateProductInput>,
  res: Response
): Promise<void> => {
  const product = await createProductService(req.body);

  const response: ApiResponse<SafeProductResponse> = {
    success: true,
    message: 'Product created successfully',
    data: product,
  };

  res.status(HttpStatus.CREATED).json(response);
};

export const listAdminProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query: ProductAdminListQuery = parseWithSchema(
    productAdminListQuerySchema,
    req.query
  );
  const result = await listAdminProductsService(query);

  const response: ApiResponse<PaginatedProductResult<SafeProductResponse>> = {
    success: true,
    message: 'Products retrieved successfully',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};

export const getProduct = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(productIdParamSchema, req.params);
  const product = await getProductById(id);

  const response: ApiResponse<SafeProductResponse> = {
    success: true,
    message: 'Product retrieved successfully',
    data: product,
  };

  res.status(HttpStatus.OK).json(response);
};

export const updateProduct = async (
  req: Request<{ id: string }, {}, UpdateProductInput>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(productIdParamSchema, req.params);
  const product = await updateProductService(id, req.body);

  const response: ApiResponse<SafeProductResponse> = {
    success: true,
    message: 'Product updated successfully',
    data: product,
  };

  res.status(HttpStatus.OK).json(response);
};

export const deleteProduct = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(productIdParamSchema, req.params);
  const product = await deleteProductService(id);

  const response: ApiResponse<SafeProductResponse> = {
    success: true,
    message: 'Product deleted successfully',
    data: product,
  };

  res.status(HttpStatus.OK).json(response);
};
