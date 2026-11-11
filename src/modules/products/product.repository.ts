import { QueryFilter, Types } from 'mongoose';
import { ProductModel } from './product.model';
import {
  CreateProductData,
  PaginatedProductResult,
  Product,
  ProductAdminFilters,
  ProductDocument,
  ProductId,
  ProductPagination,
  ProductRepository,
  PRODUCT_STATUSES,
  UpdateProductData,
} from './product.types';

export class MongooseProductRepository implements ProductRepository {
  private buildFilter(filters: ProductAdminFilters): QueryFilter<Product> {
    const filter: QueryFilter<Product> = {};

    if (filters.status) {
      filter.status = filters.status;
    }

    if (filters.category) {
      filter.category = new Types.ObjectId(filters.category);
    }

    return filter;
  }

  public async create(productData: CreateProductData): Promise<ProductDocument> {
    return ProductModel.create(productData);
  }

  public async findById(productId: ProductId): Promise<ProductDocument | null> {
    return ProductModel.findById(productId).exec();
  }

  public async findBySku(sku: string): Promise<ProductDocument | null> {
    return ProductModel.findOne({ sku }).exec();
  }

  public async findBySkuExcludingId(
    sku: string,
    productId: ProductId
  ): Promise<ProductDocument | null> {
    return ProductModel.findOne({ sku, _id: { $ne: productId } }).exec();
  }

  public async updateById(
    productId: ProductId,
    updateData: UpdateProductData
  ): Promise<ProductDocument | null> {
    return ProductModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async setInactiveById(productId: ProductId): Promise<ProductDocument | null> {
    return ProductModel.findByIdAndUpdate(
      productId,
      { $set: { status: PRODUCT_STATUSES.INACTIVE } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async findAllAdmin(
    filters: ProductAdminFilters,
    pagination: ProductPagination
  ): Promise<PaginatedProductResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const filter = this.buildFilter(filters);

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ProductModel.countDocuments(filter).exec(),
    ]);

    return {
      products,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  public async existsByCategoryId(categoryId: ProductId): Promise<boolean> {
    const product = await ProductModel.exists({ category: categoryId });
    return product !== null;
  }
}

export const productRepository: ProductRepository = new MongooseProductRepository();
