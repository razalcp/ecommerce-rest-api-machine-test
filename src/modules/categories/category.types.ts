import { HydratedDocument, Types } from 'mongoose';

export interface Category {
  name: string;
  parentId: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<Category>;
export type CategoryId = string | Types.ObjectId;

export interface CreateCategoryInput {
  name: string;
  parentId?: string | null;
}

export interface CreateCategoryData {
  name: string;
  parentId: Types.ObjectId | null;
  ancestors: Types.ObjectId[];
}

export interface UpdateCategoryInput {
  name: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  parentId: string | null;
  ancestors: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryTreeNode extends CategoryResponse {
  children: CategoryTreeNode[];
}

export interface CategoryRepository {
  create(categoryData: CreateCategoryData): Promise<CategoryDocument>;
  findById(categoryId: CategoryId): Promise<CategoryDocument | null>;
  findAll(): Promise<CategoryDocument[]>;
  updateName(categoryId: CategoryId, name: string): Promise<CategoryDocument | null>;
  deleteById(categoryId: CategoryId): Promise<CategoryDocument | null>;
  hasChildren(categoryId: CategoryId): Promise<boolean>;
  findByParentId(parentId: CategoryId): Promise<CategoryDocument[]>;
}
