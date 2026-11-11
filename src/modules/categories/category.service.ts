import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { categoryRepository } from './category.repository';
import {
  CategoryDocument,
  CategoryResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.types';

const CATEGORY_NOT_FOUND_MESSAGE = 'Category not found';
const PARENT_CATEGORY_NOT_FOUND_MESSAGE = 'Parent category not found';
const CATEGORY_HAS_CHILDREN_MESSAGE = 'Category has child categories and cannot be deleted';

const toCategoryResponse = (category: CategoryDocument): CategoryResponse => ({
  id: category._id.toString(),
  name: category.name,
  parentId: category.parentId ? category.parentId.toString() : null,
  ancestors: category.ancestors.map((ancestor) => ancestor.toString()),
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const ensureCategoryCanBeDeleted = async (categoryId: string): Promise<void> => {
  const hasChildren = await categoryRepository.hasChildren(categoryId);

  if (hasChildren) {
    throw new AppError(
      CATEGORY_HAS_CHILDREN_MESSAGE,
      HttpStatus.CONFLICT,
      'CATEGORY_HAS_CHILDREN'
    );
  }
};

export const createCategory = async (
  input: CreateCategoryInput
): Promise<CategoryResponse> => {
  const name = input.name.trim();
  let parentId: Types.ObjectId | null = null;
  let ancestors: Types.ObjectId[] = [];

  if (input.parentId) {
    const parent = await categoryRepository.findById(input.parentId);

    if (!parent) {
      throw new AppError(
        PARENT_CATEGORY_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
        'CATEGORY_NOT_FOUND'
      );
    }

    parentId = parent._id;
    ancestors = [...parent.ancestors, parent._id];
  }

  const category = await categoryRepository.create({
    name,
    parentId,
    ancestors,
  });

  return toCategoryResponse(category);
};

export const listCategories = async (): Promise<CategoryResponse[]> => {
  const categories = await categoryRepository.findAll();
  return categories.map(toCategoryResponse);
};

export const getCategoryById = async (categoryId: string): Promise<CategoryResponse> => {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new AppError(
      CATEGORY_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'CATEGORY_NOT_FOUND'
    );
  }

  return toCategoryResponse(category);
};

export const updateCategory = async (
  categoryId: string,
  input: UpdateCategoryInput
): Promise<CategoryResponse> => {
  const category = await categoryRepository.updateName(categoryId, input.name.trim());

  if (!category) {
    throw new AppError(
      CATEGORY_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'CATEGORY_NOT_FOUND'
    );
  }

  return toCategoryResponse(category);
};

export const deleteCategory = async (categoryId: string): Promise<CategoryResponse> => {
  const category = await categoryRepository.findById(categoryId);

  if (!category) {
    throw new AppError(
      CATEGORY_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'CATEGORY_NOT_FOUND'
    );
  }

  await ensureCategoryCanBeDeleted(categoryId);

  const deletedCategory = await categoryRepository.deleteById(categoryId);

  if (!deletedCategory) {
    throw new AppError(
      CATEGORY_NOT_FOUND_MESSAGE,
      HttpStatus.NOT_FOUND,
      'CATEGORY_NOT_FOUND'
    );
  }

  return toCategoryResponse(deletedCategory);
};
