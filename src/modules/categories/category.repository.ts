import { CategoryModel } from './category.model';
import {
  CategoryDocument,
  CategoryId,
  CategoryRepository,
  CreateCategoryData,
} from './category.types';

export class MongooseCategoryRepository implements CategoryRepository {
  public async create(categoryData: CreateCategoryData): Promise<CategoryDocument> {
    return CategoryModel.create(categoryData);
  }

  public async findById(categoryId: CategoryId): Promise<CategoryDocument | null> {
    return CategoryModel.findById(categoryId).exec();
  }

  public async findAll(): Promise<CategoryDocument[]> {
    return CategoryModel.find().sort({ name: 1, _id: 1 }).exec();
  }

  public async updateName(
    categoryId: CategoryId,
    name: string
  ): Promise<CategoryDocument | null> {
    return CategoryModel.findByIdAndUpdate(
      categoryId,
      { $set: { name } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async deleteById(categoryId: CategoryId): Promise<CategoryDocument | null> {
    return CategoryModel.findByIdAndDelete(categoryId).exec();
  }

  public async hasChildren(categoryId: CategoryId): Promise<boolean> {
    const child = await CategoryModel.exists({ parentId: categoryId });
    return child !== null;
  }

  public async findByParentId(parentId: CategoryId): Promise<CategoryDocument[]> {
    return CategoryModel.find({ parentId }).sort({ name: 1, _id: 1 }).exec();
  }
}

export const categoryRepository: CategoryRepository = new MongooseCategoryRepository();
