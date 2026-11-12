import { PipelineStage, QueryFilter, Types } from 'mongoose';
import { ProductModel } from './product.model';
import {
  CreateProductData,
  PaginatedProductResult,
  Product,
  ProductAdminFilters,
  ProductDocument,
  ProductId,
  ProductPagination,
  ProductRecord,
  ProductRepository,
  ProductSorting,
  PRODUCT_SORT_FIELDS,
  PRODUCT_SORT_ORDERS,
  PRODUCT_STATUSES,
  PublicPaginatedProductResult,
  PublicProductFilters,
  STOCK_RESTORATION_STATUSES,
  StockRestorationResult,
  UpdateProductData,
} from './product.types';

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface ActiveProductFacetResult {
  products: ProductRecord[];
  metadata: Array<{ total: number }>;
}

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

  private buildActiveFilter(filters: PublicProductFilters): QueryFilter<Product> {
    const filter: QueryFilter<Product> = { status: PRODUCT_STATUSES.ACTIVE };

    if (filters.search) {
      const search = escapeRegex(filters.search.trim());

      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      filter.category = { $in: filters.categoryIds };
    }

    return filter;
  }

  private buildActiveSort(sorting: ProductSorting): Record<string, 1 | -1> {
    const direction = sorting.sortOrder === PRODUCT_SORT_ORDERS.ASC ? 1 : -1;
    const sortField =
      sorting.sortBy === PRODUCT_SORT_FIELDS.PRICE ? 'effectivePrice' : sorting.sortBy;

    return { [sortField]: direction, _id: direction };
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

  public async findActiveProducts(
    filters: PublicProductFilters,
    pagination: ProductPagination,
    sorting: ProductSorting
  ): Promise<PublicPaginatedProductResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;
    const pipeline: PipelineStage[] = [
      { $match: this.buildActiveFilter(filters) as Record<string, unknown> },
      { $addFields: { effectivePrice: { $ifNull: ['$salePrice', '$price'] } } },
    ];

    const priceRange: Record<string, number> = {};

    if (filters.minPrice !== undefined) {
      priceRange.$gte = filters.minPrice;
    }

    if (filters.maxPrice !== undefined) {
      priceRange.$lte = filters.maxPrice;
    }

    if (Object.keys(priceRange).length > 0) {
      pipeline.push({ $match: { effectivePrice: priceRange } });
    }

    pipeline.push({
      $facet: {
        products: [
          { $sort: this.buildActiveSort(sorting) },
          { $skip: skip },
          { $limit: limit },
        ],
        metadata: [{ $count: 'total' }],
      },
    });

    const [result] = await ProductModel.aggregate<ActiveProductFacetResult>(pipeline).exec();
    const total = result?.metadata[0]?.total ?? 0;

    return {
      products: result?.products ?? [],
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  public async findActiveById(productId: ProductId): Promise<ProductDocument | null> {
    return ProductModel.findOne({
      _id: productId,
      status: PRODUCT_STATUSES.ACTIVE,
    }).exec();
  }

  public async findActiveByIds(productIds: ProductId[]): Promise<ProductDocument[]> {
    return ProductModel.find({
      _id: { $in: productIds },
      status: PRODUCT_STATUSES.ACTIVE,
    }).exec();
  }

  public async reserveStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument | null> {
    return ProductModel.findOneAndUpdate(
      {
        _id: productId,
        status: PRODUCT_STATUSES.ACTIVE,
        stock: { $gte: quantity },
      },
      { $inc: { stock: -quantity } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async restoreStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument> {
    const product = await ProductModel.findByIdAndUpdate(
      productId,
      { $inc: { stock: quantity } },
      { returnDocument: 'after', runValidators: true }
    ).exec();

    if (!product) {
      throw new Error(`Failed to restore stock for product ${productId.toString()}`);
    }

    return product;
  }

  public async restoreStockOnce(
    productId: ProductId,
    quantity: number,
    operationKey: string
  ): Promise<StockRestorationResult> {
    const restoredProduct = await ProductModel.findOneAndUpdate(
      {
        _id: productId,
        stockRestorationKeys: { $ne: operationKey },
      },
      {
        $inc: { stock: quantity },
        $addToSet: { stockRestorationKeys: operationKey },
      },
      { returnDocument: 'after', runValidators: true }
    ).exec();

    if (restoredProduct) {
      return {
        status: STOCK_RESTORATION_STATUSES.APPLIED,
        product: restoredProduct,
      };
    }

    const existingProduct = await ProductModel.findById(productId).exec();

    if (!existingProduct) {
      return {
        status: STOCK_RESTORATION_STATUSES.PRODUCT_NOT_FOUND,
        product: null,
      };
    }

    return {
      status: STOCK_RESTORATION_STATUSES.ALREADY_APPLIED,
      product: existingProduct,
    };
  }

  public async existsByCategoryId(categoryId: ProductId): Promise<boolean> {
    const product = await ProductModel.exists({ category: categoryId });
    return product !== null;
  }
}

export const productRepository: ProductRepository = new MongooseProductRepository();
