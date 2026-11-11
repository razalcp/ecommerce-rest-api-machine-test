import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { categoryRepository } from './category.repository';
import {
  CategoryAncestorUpdate,
  CategoryDocument,
  CategoryResponse,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
} from './category.types';

const CATEGORY_NOT_FOUND_MESSAGE = 'Category not found';
const PARENT_CATEGORY_NOT_FOUND_MESSAGE = 'Parent category not found';
const CATEGORY_HAS_CHILDREN_MESSAGE = 'Category has child categories and cannot be deleted';
const INVALID_CATEGORY_PARENT_MESSAGE = 'A category cannot be its own parent';
const CIRCULAR_CATEGORY_REFERENCE_MESSAGE =
  'A category cannot be moved under one of its descendants';
const UPDATE_CATEGORY_EMPTY_MESSAGE = 'At least one of name or parentId must be provided';
const CATEGORY_HIERARCHY_INTEGRITY_CODE = 'CATEGORY_HIERARCHY_INTEGRITY_ERROR';

const toCategoryResponse = (category: CategoryDocument): CategoryResponse => ({
  id: category._id.toString(),
  name: category.name,
  parentId: category.parentId ? category.parentId.toString() : null,
  ancestors: category.ancestors.map((ancestor) => ancestor.toString()),
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const toCategoryTreeNode = (category: CategoryDocument): CategoryTreeNode => ({
  id: category._id.toString(),
  name: category.name,
  parentId: category.parentId ? category.parentId.toString() : null,
  children: [],
});

const sortCategoryTree = (nodes: CategoryTreeNode[]): void => {
  const pendingNodes = [...nodes];

  while (pendingNodes.length > 0) {
    const node = pendingNodes.pop();

    if (!node) {
      continue;
    }

    node.children.sort((first, second) => {
      const nameComparison = first.name.localeCompare(second.name);
      return nameComparison !== 0 ? nameComparison : first.id.localeCompare(second.id);
    });

    pendingNodes.push(...node.children);
  }
};

const validateCategoryHierarchy = (
  categories: CategoryDocument[],
  nodesById: Map<string, CategoryTreeNode>
): Map<string, string | null> => {
  const parentIdByCategoryId = new Map<string, string | null>();

  categories.forEach((category) => {
    const categoryId = category._id.toString();
    const parentId = category.parentId ? category.parentId.toString() : null;

    if (parentId !== null && !nodesById.has(parentId)) {
      throw new AppError(
        'Category hierarchy contains a missing parent reference',
        HttpStatus.INTERNAL_SERVER_ERROR,
        CATEGORY_HIERARCHY_INTEGRITY_CODE
      );
    }

    parentIdByCategoryId.set(categoryId, parentId);
  });

  const completedCategoryIds = new Set<string>();

  parentIdByCategoryId.forEach((_parentId, categoryId) => {
    const currentPath = new Set<string>();
    let currentCategoryId: string | null = categoryId;

    while (
      currentCategoryId !== null &&
      !completedCategoryIds.has(currentCategoryId)
    ) {
      if (currentPath.has(currentCategoryId)) {
        throw new AppError(
          'Category hierarchy contains a circular parent reference',
          HttpStatus.INTERNAL_SERVER_ERROR,
          CATEGORY_HIERARCHY_INTEGRITY_CODE
        );
      }

      currentPath.add(currentCategoryId);
      currentCategoryId = parentIdByCategoryId.get(currentCategoryId) ?? null;
    }

    currentPath.forEach((visitedCategoryId) => completedCategoryIds.add(visitedCategoryId));
  });

  return parentIdByCategoryId;
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

const buildDescendantAncestorUpdates = (
  descendants: CategoryDocument[],
  categoryId: Types.ObjectId,
  newAncestors: Types.ObjectId[]
): CategoryAncestorUpdate[] => {
  return descendants.map((descendant) => {
    const movedCategoryIndex = descendant.ancestors.findIndex((ancestor) =>
      ancestor.equals(categoryId)
    );

    if (movedCategoryIndex < 0) {
      throw new AppError(
        'Category hierarchy contains an inconsistent ancestor reference',
        HttpStatus.INTERNAL_SERVER_ERROR,
        CATEGORY_HIERARCHY_INTEGRITY_CODE
      );
    }

    const preservedDescendantAncestors = descendant.ancestors.slice(
      movedCategoryIndex + 1
    );

    return {
      categoryId: descendant._id,
      ancestors: [...newAncestors, categoryId, ...preservedDescendantAncestors],
    };
  });
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

export const getCategoryTree = async (): Promise<CategoryTreeNode[]> => {
  const categories = await categoryRepository.findAll();
  const nodesById = new Map<string, CategoryTreeNode>();

  categories.forEach((category) => {
    nodesById.set(category._id.toString(), toCategoryTreeNode(category));
  });

  const parentIdByCategoryId = validateCategoryHierarchy(categories, nodesById);
  const rootNodes: CategoryTreeNode[] = [];

  categories.forEach((category) => {
    const categoryId = category._id.toString();
    const node = nodesById.get(categoryId);
    const parentId = parentIdByCategoryId.get(categoryId) ?? null;

    if (!node) {
      throw new AppError(
        'Category hierarchy contains an inconsistent category record',
        HttpStatus.INTERNAL_SERVER_ERROR,
        CATEGORY_HIERARCHY_INTEGRITY_CODE
      );
    }

    if (parentId !== null) {
      const parentNode = nodesById.get(parentId);

      if (!parentNode) {
        throw new AppError(
          'Category hierarchy contains a missing parent reference',
          HttpStatus.INTERNAL_SERVER_ERROR,
          CATEGORY_HIERARCHY_INTEGRITY_CODE
        );
      }

      parentNode.children.push(node);
      return;
    }

    rootNodes.push(node);
  });

  sortCategoryTree(rootNodes);

  return rootNodes;
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
  const hasNameUpdate = input.name !== undefined;
  const hasParentUpdate = input.parentId !== undefined;

  if (!hasNameUpdate && !hasParentUpdate) {
    throw new AppError(
      UPDATE_CATEGORY_EMPTY_MESSAGE,
      HttpStatus.UNPROCESSABLE_ENTITY,
      'VALIDATION_ERROR'
    );
  }

  const category = await findCategoryOrThrow(categoryId);
  let updatedCategory = category;

  if (hasParentUpdate) {
    const requestedParentId = input.parentId ?? null;
    const requestedParentObjectId =
      requestedParentId !== null ? new Types.ObjectId(requestedParentId) : null;

    if (
      requestedParentObjectId !== null &&
      requestedParentObjectId.equals(category._id)
    ) {
      throw new AppError(
        INVALID_CATEGORY_PARENT_MESSAGE,
        HttpStatus.BAD_REQUEST,
        'INVALID_CATEGORY_PARENT'
      );
    }

    const isSameParent =
      requestedParentObjectId === null
        ? category.parentId === null
        : category.parentId !== null && requestedParentObjectId.equals(category.parentId);

    if (!isSameParent) {
      let parentId: Types.ObjectId | null = null;
      let newAncestors: Types.ObjectId[] = [];

      if (requestedParentObjectId !== null) {
        const parent = await categoryRepository.findById(requestedParentObjectId);

        if (!parent) {
          throw new AppError(
            PARENT_CATEGORY_NOT_FOUND_MESSAGE,
            HttpStatus.NOT_FOUND,
            'CATEGORY_NOT_FOUND'
          );
        }

        const isDescendant = parent.ancestors.some((ancestor) =>
          ancestor.equals(category._id)
        );

        if (isDescendant) {
          throw new AppError(
            CIRCULAR_CATEGORY_REFERENCE_MESSAGE,
            HttpStatus.CONFLICT,
            'CIRCULAR_CATEGORY_REFERENCE'
          );
        }

        parentId = parent._id;
        newAncestors = [...parent.ancestors, parent._id];
      }

      const descendants = await categoryRepository.findDescendantsByAncestorId(category._id);
      const descendantUpdates = buildDescendantAncestorUpdates(
        descendants,
        category._id,
        newAncestors
      );
      const movedCategory = await categoryRepository.updateParentAndAncestors(
        category._id,
        parentId,
        newAncestors
      );

      if (!movedCategory) {
        throw new AppError(
          CATEGORY_NOT_FOUND_MESSAGE,
          HttpStatus.NOT_FOUND,
          'CATEGORY_NOT_FOUND'
        );
      }

      updatedCategory = movedCategory;

      await categoryRepository.updateDescendantAncestors(descendantUpdates);
    }
  }

  if (input.name !== undefined) {
    const renamedCategory = await categoryRepository.updateName(
      category._id,
      input.name.trim()
    );

    if (!renamedCategory) {
      throw new AppError(
        CATEGORY_NOT_FOUND_MESSAGE,
        HttpStatus.NOT_FOUND,
        'CATEGORY_NOT_FOUND'
      );
    }

    updatedCategory = renamedCategory;
  }

  return toCategoryResponse(updatedCategory);
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
