import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { parseWithSchema } from '../../shared/utils/validation.util';
import {
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  getCategoryById,
  getCategoryTree as getCategoryTreeService,
  listCategories as listCategoriesService,
  updateCategory as updateCategoryService,
} from './category.service';
import {
  CategoryResponse,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.types';
import { categoryIdParamSchema } from './category.validation';

export const listCategories = async (_req: Request, res: Response): Promise<void> => {
  const categories = await listCategoriesService();

  const response: ApiResponse<CategoryResponse[]> = {
    success: true,
    message: 'Categories retrieved successfully',
    data: categories,
  };

  res.status(HttpStatus.OK).json(response);
};

export const getCategoryTree = async (_req: Request, res: Response): Promise<void> => {
  const categories = await getCategoryTreeService();

  const response: ApiResponse<{ categories: CategoryTreeNode[] }> = {
    success: true,
    message: 'Category hierarchy retrieved successfully',
    data: { categories },
  };

  res.status(HttpStatus.OK).json(response);
};

export const getCategory = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(categoryIdParamSchema, req.params);
  const category = await getCategoryById(id);

  const response: ApiResponse<CategoryResponse> = {
    success: true,
    message: 'Category retrieved successfully',
    data: category,
  };

  res.status(HttpStatus.OK).json(response);
};

export const createCategory = async (
  req: Request<{}, {}, CreateCategoryInput>,
  res: Response
): Promise<void> => {
  const category = await createCategoryService(req.body);

  const response: ApiResponse<CategoryResponse> = {
    success: true,
    message: 'Category created successfully',
    data: category,
  };

  res.status(HttpStatus.CREATED).json(response);
};

export const updateCategory = async (
  req: Request<{ id: string }, {}, UpdateCategoryInput>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(categoryIdParamSchema, req.params);
  const category = await updateCategoryService(id, req.body);

  const response: ApiResponse<CategoryResponse> = {
    success: true,
    message: 'Category updated successfully',
    data: category,
  };

  res.status(HttpStatus.OK).json(response);
};

export const deleteCategory = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(categoryIdParamSchema, req.params);
  const category = await deleteCategoryService(id);

  const response: ApiResponse<CategoryResponse> = {
    success: true,
    message: 'Category deleted successfully',
    data: category,
  };

  res.status(HttpStatus.OK).json(response);
};
