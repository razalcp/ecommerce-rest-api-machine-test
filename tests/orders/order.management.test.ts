import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { OrderService } from '../../src/modules/orders/order.service';
import {
  CreateOrderData,
  INVENTORY_STATUSES,
  InventoryStatus,
  OrderAdminFilters,
  OrderCustomerId,
  OrderDocument,
  OrderId,
  OrderItem,
  OrderPagination,
  ORDER_STATUSES,
  OrderRepository,
  OrderStatus,
  PaginatedOrderResult,
} from '../../src/modules/orders/order.types';
import { ProductModel } from '../../src/modules/products/product.model';
import { MongooseProductRepository } from '../../src/modules/products/product.repository';
import {
  PRODUCT_STATUSES,
  ProductDocument,
  ProductId,
  ProductStatus,
  StockRestorationResult,
  STOCK_RESTORATION_STATUSES,
} from '../../src/modules/products/product.types';
import { AppError } from '../../src/shared/errors/app-error';

const CUSTOMER_ID = '665f1b2c9a1b2c3d4e5f6789';
const OTHER_CUSTOMER_ID = '665f1b2c9a1b2c3d4e5f6790';
const PRODUCT_A = '665f1b2c9a1b2c3d4e5f6795';
const PRODUCT_B = '665f191e810c19729de860ea';
const PRODUCT_C = '665f191e810c19729de860eb';

const operationKey = (orderId: string, productId: string): string =>
  `order-cancel:${orderId}:${productId}`;

interface FakeOrderRecord {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  items: OrderItem[];
  subtotalPaise: number;
  totalPaise: number;
  currency: 'INR';
  status: OrderStatus;
  inventoryStatus: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface FakeProductRecord {
  _id: Types.ObjectId;
  stock: number;
  status: ProductStatus;
  restorationKeys: Set<string>;
}

interface FakeProductSeed {
  id: string;
  stock: number;
  status?: ProductStatus;
}

const createItem = (productId: string, quantity = 1): OrderItem => {
  const unitPricePaise = 10000;

  return {
    productId: new Types.ObjectId(productId),
    name: `Product ${productId.slice(-1)}`,
    sku: `SKU-${productId.slice(-1)}`,
    quantity,
    unitPricePaise,
    lineTotalPaise: unitPricePaise * quantity,
  };
};

const createOrderRecord = (
  overrides: Partial<FakeOrderRecord> = {}
): FakeOrderRecord => {
  const timestamp = new Date('2026-11-12T10:00:00.000Z');

  return {
    _id: new Types.ObjectId(),
    customerId: new Types.ObjectId(CUSTOMER_ID),
    items: [createItem(PRODUCT_A, 1)],
    subtotalPaise: 10000,
    totalPaise: 10000,
    currency: 'INR',
    status: ORDER_STATUSES.PENDING,
    inventoryStatus: INVENTORY_STATUSES.RESERVED,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
};

const toOrderDocument = (record: FakeOrderRecord): OrderDocument =>
  ({ ...record }) as unknown as OrderDocument;

const toProductDocument = (record: FakeProductRecord): ProductDocument =>
  record as unknown as ProductDocument;

const paginateOrders = (
  records: FakeOrderRecord[],
  pagination: OrderPagination
): PaginatedOrderResult => {
  const { page, limit } = pagination;
  const sorted = [...records].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
  const total = sorted.length;
  const start = (page - 1) * limit;

  return {
    orders: sorted.slice(start, start + limit).map(toOrderDocument),
    total,
    page,
    limit,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
};

class FakeOrderRepository implements OrderRepository {
  public readonly orders: FakeOrderRecord[];

  constructor(orders: FakeOrderRecord[] = []) {
    this.orders = [...orders];
  }

  public async create(orderData: CreateOrderData): Promise<OrderDocument> {
    const timestamp = new Date();
    const record: FakeOrderRecord = {
      _id: new Types.ObjectId(),
      ...orderData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.orders.push(record);
    return toOrderDocument(record);
  }

  public async findById(orderId: OrderId): Promise<OrderDocument | null> {
    const record =
      this.orders.find((order) => order._id.toString() === orderId.toString()) ??
      null;

    return record ? toOrderDocument(record) : null;
  }

  public async findByIdAndCustomerId(
    orderId: OrderId,
    customerId: OrderCustomerId
  ): Promise<OrderDocument | null> {
    const record =
      this.orders.find(
        (order) =>
          order._id.toString() === orderId.toString() &&
          order.customerId.toString() === customerId.toString()
      ) ?? null;

    return record ? toOrderDocument(record) : null;
  }

  public async findCustomerOrders(
    customerId: OrderCustomerId,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult> {
    return paginateOrders(
      this.orders.filter(
        (order) => order.customerId.toString() === customerId.toString()
      ),
      pagination
    );
  }

  public async findAllAdminOrders(
    filters: OrderAdminFilters,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult> {
    return paginateOrders(
      this.orders.filter((order) => {
        const matchesStatus = !filters.status || order.status === filters.status;
        const matchesCustomer =
          !filters.customerId ||
          order.customerId.toString() === filters.customerId;

        return matchesStatus && matchesCustomer;
      }),
      pagination
    );
  }

  public async updateStatusIfCurrent(
    orderId: OrderId,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus
  ): Promise<OrderDocument | null> {
    const record = this.orders.find(
      (order) =>
        order._id.toString() === orderId.toString() &&
        order.status === expectedStatus
    );

    if (!record) {
      return null;
    }

    record.status = nextStatus;
    record.updatedAt = new Date(record.updatedAt.getTime() + 1000);
    return toOrderDocument(record);
  }

  public async beginCancellation(
    orderId: OrderId,
    expectedStatus: OrderStatus
  ): Promise<OrderDocument | null> {
    const record = this.orders.find(
      (order) =>
        order._id.toString() === orderId.toString() &&
        order.status === expectedStatus &&
        order.inventoryStatus === INVENTORY_STATUSES.RESERVED
    );

    if (!record) {
      return null;
    }

    record.status = ORDER_STATUSES.CANCELLED;
    record.inventoryStatus = INVENTORY_STATUSES.RESTORING;
    record.updatedAt = new Date(record.updatedAt.getTime() + 1000);
    return toOrderDocument(record);
  }

  public async completeInventoryRelease(
    orderId: OrderId
  ): Promise<OrderDocument | null> {
    const record = this.orders.find(
      (order) =>
        order._id.toString() === orderId.toString() &&
        order.status === ORDER_STATUSES.CANCELLED &&
        order.inventoryStatus === INVENTORY_STATUSES.RESTORING
    );

    if (!record) {
      return null;
    }

    record.inventoryStatus = INVENTORY_STATUSES.RELEASED;
    record.updatedAt = new Date(record.updatedAt.getTime() + 1000);
    return toOrderDocument(record);
  }
}

class FakeProductRepository {
  public readonly products = new Map<string, FakeProductRecord>();
  public readonly restoreAttempts: Array<{
    productId: string;
    quantity: number;
    operationKey: string;
  }> = [];
  public readonly failedRestorationIds = new Set<string>();

  constructor(seeds: FakeProductSeed[] = []) {
    for (const seed of seeds) {
      const record: FakeProductRecord = {
        _id: new Types.ObjectId(seed.id),
        stock: seed.stock,
        status: seed.status ?? PRODUCT_STATUSES.ACTIVE,
        restorationKeys: new Set<string>(),
      };

      this.products.set(seed.id, record);
    }
  }

  public async findActiveByIds(productIds: ProductId[]): Promise<ProductDocument[]> {
    return productIds
      .map((productId) => this.products.get(productId.toString()))
      .filter(
        (product): product is FakeProductRecord =>
          product !== undefined && product.status === PRODUCT_STATUSES.ACTIVE
      )
      .map(toProductDocument);
  }

  public async reserveStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument | null> {
    const product = this.products.get(productId.toString());

    if (
      !product ||
      product.status !== PRODUCT_STATUSES.ACTIVE ||
      product.stock < quantity
    ) {
      return null;
    }

    product.stock -= quantity;
    return toProductDocument(product);
  }

  public async restoreStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument> {
    const product = this.products.get(productId.toString());

    if (!product) {
      throw new Error('Simulated missing product');
    }

    product.stock += quantity;
    return toProductDocument(product);
  }

  public async restoreStockOnce(
    productId: ProductId,
    quantity: number,
    key: string
  ): Promise<StockRestorationResult> {
    const id = productId.toString();
    this.restoreAttempts.push({ productId: id, quantity, operationKey: key });

    if (this.failedRestorationIds.has(id)) {
      throw new Error('Simulated stock restoration failure');
    }

    const product = this.products.get(id);

    if (!product) {
      return {
        status: STOCK_RESTORATION_STATUSES.PRODUCT_NOT_FOUND,
        product: null,
      };
    }

    if (product.restorationKeys.has(key)) {
      return {
        status: STOCK_RESTORATION_STATUSES.ALREADY_APPLIED,
        product: toProductDocument(product),
      };
    }

    product.restorationKeys.add(key);
    product.stock += quantity;

    return {
      status: STOCK_RESTORATION_STATUSES.APPLIED,
      product: toProductDocument(product),
    };
  }
}

interface TestContext {
  service: OrderService;
  orderRepository: FakeOrderRepository;
  productRepository: FakeProductRepository;
}

const setup = (
  orders: FakeOrderRecord[] = [],
  products: FakeProductSeed[] = [
    { id: PRODUCT_A, stock: 0 },
    { id: PRODUCT_B, stock: 0 },
    { id: PRODUCT_C, stock: 0 },
  ]
): TestContext => {
  const orderRepository = new FakeOrderRepository(orders);
  const productRepository = new FakeProductRepository(products);
  const service = new OrderService({ orderRepository, productRepository });

  return { service, orderRepository, productRepository };
};

const expectAppError = async (
  operation: Promise<unknown>,
  expectedStatusCode: number,
  expectedCode: string
): Promise<AppError> => {
  try {
    await operation;
    assert.fail('Expected the operation to reject');
  } catch (error) {
    if (error instanceof AppError) {
      assert.equal(error.statusCode, expectedStatusCode);
      assert.equal(error.code, expectedCode);
      return error;
    }

    throw error;
  }
};

test('customer order history returns only the authenticated customer orders', async () => {
  const ownOrder = createOrderRecord();
  const otherOrder = createOrderRecord({
    customerId: new Types.ObjectId(OTHER_CUSTOMER_ID),
  });
  const context = setup([ownOrder, otherOrder]);

  const result = await context.service.getCustomerOrders(CUSTOMER_ID, {
    page: 1,
    limit: 10,
  });

  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, ownOrder._id.toString());
  assert.equal('customerId' in result.orders[0], false);
  assert.equal('inventoryStatus' in result.orders[0], false);
  assert.equal(result.pagination.total, 1);
});

test('customer order history sorts newest first and paginates', async () => {
  const oldest = createOrderRecord({
    createdAt: new Date('2026-11-10T10:00:00.000Z'),
  });
  const middle = createOrderRecord({
    createdAt: new Date('2026-11-11T10:00:00.000Z'),
  });
  const newest = createOrderRecord({
    createdAt: new Date('2026-11-12T10:00:00.000Z'),
  });
  const context = setup([oldest, newest, middle]);

  const result = await context.service.getCustomerOrders(CUSTOMER_ID, {
    page: 1,
    limit: 2,
  });

  assert.deepEqual(
    result.orders.map((order) => order.id),
    [newest._id.toString(), middle._id.toString()]
  );
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.limit, 2);
  assert.equal(result.pagination.total, 3);
  assert.equal(result.pagination.totalPages, 2);
});

test('customer order history returns an empty page beyond the last page', async () => {
  const context = setup([createOrderRecord()]);

  const result = await context.service.getCustomerOrders(CUSTOMER_ID, {
    page: 5,
    limit: 10,
  });

  assert.deepEqual(result.orders, []);
  assert.equal(result.pagination.total, 1);
  assert.equal(result.pagination.totalPages, 1);
});

test('customer can retrieve their own order', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.CONFIRMED });
  const context = setup([order]);

  const result = await context.service.getCustomerOrderById(
    CUSTOMER_ID,
    order._id.toString()
  );

  assert.equal(result.id, order._id.toString());
  assert.equal(result.status, ORDER_STATUSES.CONFIRMED);
  assert.equal(result.updatedAt, order.updatedAt);
});

test('customer cannot retrieve another customer order', async () => {
  const order = createOrderRecord({
    customerId: new Types.ObjectId(OTHER_CUSTOMER_ID),
  });
  const context = setup([order]);

  await expectAppError(
    context.service.getCustomerOrderById(CUSTOMER_ID, order._id.toString()),
    404,
    'ORDER_NOT_FOUND'
  );
});

test('customer order detail returns not found for a missing order', async () => {
  const context = setup();

  await expectAppError(
    context.service.getCustomerOrderById(CUSTOMER_ID, new Types.ObjectId().toString()),
    404,
    'ORDER_NOT_FOUND'
  );
});

test('admin order listing returns all orders with operational fields', async () => {
  const first = createOrderRecord();
  const second = createOrderRecord({
    customerId: new Types.ObjectId(OTHER_CUSTOMER_ID),
    status: ORDER_STATUSES.PROCESSING,
    createdAt: new Date('2026-11-12T11:00:00.000Z'),
  });
  const context = setup([first, second]);

  const result = await context.service.getAdminOrders({ page: 1, limit: 10 });

  assert.equal(result.orders.length, 2);
  assert.equal(result.orders[0].customerId, second.customerId.toString());
  assert.equal(result.orders[0].inventoryStatus, INVENTORY_STATUSES.RESERVED);
});

test('admin order listing filters by status', async () => {
  const pending = createOrderRecord();
  const confirmed = createOrderRecord({ status: ORDER_STATUSES.CONFIRMED });
  const context = setup([pending, confirmed]);

  const result = await context.service.getAdminOrders(
    { status: ORDER_STATUSES.CONFIRMED, page: 1, limit: 10 }
  );

  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, confirmed._id.toString());
});

test('admin order listing filters by customer and paginates', async () => {
  const first = createOrderRecord({
    customerId: new Types.ObjectId(OTHER_CUSTOMER_ID),
    createdAt: new Date('2026-11-11T10:00:00.000Z'),
  });
  const second = createOrderRecord({
    customerId: new Types.ObjectId(OTHER_CUSTOMER_ID),
    createdAt: new Date('2026-11-12T10:00:00.000Z'),
  });
  const third = createOrderRecord();
  const context = setup([first, second, third]);

  const result = await context.service.getAdminOrders({
    customerId: OTHER_CUSTOMER_ID,
    page: 1,
    limit: 1,
  });

  assert.equal(result.orders.length, 1);
  assert.equal(result.orders[0].id, second._id.toString());
  assert.equal(result.pagination.total, 2);
  assert.equal(result.pagination.totalPages, 2);
});

test('admin order detail includes customer and inventory status', async () => {
  const order = createOrderRecord();
  const context = setup([order]);

  const result = await context.service.getAdminOrderById(order._id.toString());

  assert.equal(result.id, order._id.toString());
  assert.equal(result.customerId, CUSTOMER_ID);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RESERVED);
});

test('admin order detail returns not found for a missing order', async () => {
  const context = setup();

  await expectAppError(
    context.service.getAdminOrderById(new Types.ObjectId().toString()),
    404,
    'ORDER_NOT_FOUND'
  );
});

test('admin can confirm a pending order', async () => {
  const order = createOrderRecord();
  const context = setup([order]);

  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.CONFIRMED
  );

  assert.equal(result.status, ORDER_STATUSES.CONFIRMED);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RESERVED);
  assert.equal(order.status, ORDER_STATUSES.CONFIRMED);
});

test('admin can move a confirmed order to processing', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.CONFIRMED });
  const context = setup([order]);

  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.PROCESSING
  );

  assert.equal(result.status, ORDER_STATUSES.PROCESSING);
});

test('admin can move a processing order to shipped', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.PROCESSING });
  const context = setup([order]);

  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.SHIPPED
  );

  assert.equal(result.status, ORDER_STATUSES.SHIPPED);
});

test('admin can move a shipped order to delivered', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.SHIPPED });
  const context = setup([order]);

  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.DELIVERED
  );

  assert.equal(result.status, ORDER_STATUSES.DELIVERED);
});

test('rejects a pending to shipped status transition', async () => {
  const order = createOrderRecord();
  const context = setup([order]);

  await expectAppError(
    context.service.updateOrderStatus(order._id.toString(), ORDER_STATUSES.SHIPPED),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.PENDING);
});

test('rejects cancelling a delivered order', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.DELIVERED });
  const context = setup([order]);

  await expectAppError(
    context.service.updateOrderStatus(
      order._id.toString(),
      ORDER_STATUSES.CANCELLED
    ),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.DELIVERED);
});

test('rejects reopening a cancelled order', async () => {
  const order = createOrderRecord({
    status: ORDER_STATUSES.CANCELLED,
    inventoryStatus: INVENTORY_STATUSES.RELEASED,
  });
  const context = setup([order]);

  await expectAppError(
    context.service.updateOrderStatus(
      order._id.toString(),
      ORDER_STATUSES.CONFIRMED
    ),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.CANCELLED);
});

test('an invalid transition does not mutate status or inventory', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.CONFIRMED });
  const context = setup([order]);

  await expectAppError(
    context.service.updateOrderStatus(order._id.toString(), ORDER_STATUSES.DELIVERED),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.CONFIRMED);
  assert.equal(order.inventoryStatus, INVENTORY_STATUSES.RESERVED);
  assert.equal(context.productRepository.restoreAttempts.length, 0);
});

test('status update returns not found for a missing order', async () => {
  const context = setup();

  await expectAppError(
    context.service.updateOrderStatus(
      new Types.ObjectId().toString(),
      ORDER_STATUSES.CONFIRMED
    ),
    404,
    'ORDER_NOT_FOUND'
  );
});

test('cancelling a pending order restores reserved stock', async () => {
  const order = createOrderRecord({ items: [createItem(PRODUCT_A, 2)] });
  const context = setup([order]);

  const result = await context.service.cancelOrder(order._id.toString());
  const product = context.productRepository.products.get(PRODUCT_A);

  assert.equal(result.status, ORDER_STATUSES.CANCELLED);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(product?.stock, 2);
  assert.equal(
    product?.restorationKeys.has(operationKey(order._id.toString(), PRODUCT_A)),
    true
  );
});

test('cancelling a confirmed order restores reserved stock', async () => {
  const order = createOrderRecord({
    status: ORDER_STATUSES.CONFIRMED,
    items: [createItem(PRODUCT_A, 3)],
  });
  const context = setup([order]);

  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.CANCELLED
  );

  assert.equal(result.status, ORDER_STATUSES.CANCELLED);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 3);
});

test('cancelling a processing order restores every item once', async () => {
  const order = createOrderRecord({
    status: ORDER_STATUSES.PROCESSING,
    items: [createItem(PRODUCT_A, 2), createItem(PRODUCT_B, 1)],
  });
  const context = setup([order]);

  const result = await context.service.cancelOrder(order._id.toString());

  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 2);
  assert.equal(context.productRepository.products.get(PRODUCT_B)?.stock, 1);
});

test('cancelling a shipped order is rejected without restoring stock', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.SHIPPED });
  const context = setup([order]);

  await expectAppError(
    context.service.cancelOrder(order._id.toString()),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.SHIPPED);
  assert.equal(context.productRepository.restoreAttempts.length, 0);
});

test('cancelling a delivered order is rejected without restoring stock', async () => {
  const order = createOrderRecord({ status: ORDER_STATUSES.DELIVERED });
  const context = setup([order]);

  await expectAppError(
    context.service.cancelOrder(order._id.toString()),
    409,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

  assert.equal(order.status, ORDER_STATUSES.DELIVERED);
  assert.equal(context.productRepository.restoreAttempts.length, 0);
});

test('duplicate cancellation requests do not increment stock twice', async () => {
  const order = createOrderRecord({ items: [createItem(PRODUCT_A, 2)] });
  const context = setup([order]);

  await context.service.cancelOrder(order._id.toString());
  const result = await context.service.cancelOrder(order._id.toString());

  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 2);
  assert.equal(context.productRepository.restoreAttempts.length, 1);
});

test('cancelling an already released order returns it without restoring again', async () => {
  const order = createOrderRecord({
    status: ORDER_STATUSES.CANCELLED,
    inventoryStatus: INVENTORY_STATUSES.RELEASED,
  });
  const context = setup([order]);

  const result = await context.service.cancelOrder(order._id.toString());

  assert.equal(result.status, ORDER_STATUSES.CANCELLED);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(context.productRepository.restoreAttempts.length, 0);
});

test('partial restoration failure keeps CANCELLED RESTORING and restores eligible items', async () => {
  const order = createOrderRecord({
    items: [createItem(PRODUCT_A, 2), createItem(PRODUCT_B, 1)],
  });
  const context = setup([order]);
  context.productRepository.failedRestorationIds.add(PRODUCT_A);

  await expectAppError(
    context.service.cancelOrder(order._id.toString()),
    500,
    'INVENTORY_RESTORATION_FAILED'
  );

  assert.equal(order.status, ORDER_STATUSES.CANCELLED);
  assert.equal(order.inventoryStatus, INVENTORY_STATUSES.RESTORING);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 0);
  assert.equal(context.productRepository.products.get(PRODUCT_B)?.stock, 1);
  assert.equal(context.productRepository.restoreAttempts.length, 2);
});

test('retrying cancellation completes restoration without double incrementing', async () => {
  const order = createOrderRecord({
    items: [createItem(PRODUCT_A, 2), createItem(PRODUCT_B, 1)],
  });
  const context = setup([order]);
  context.productRepository.failedRestorationIds.add(PRODUCT_A);

  await expectAppError(
    context.service.cancelOrder(order._id.toString()),
    500,
    'INVENTORY_RESTORATION_FAILED'
  );

  context.productRepository.failedRestorationIds.delete(PRODUCT_A);

  const result = await context.service.cancelOrder(order._id.toString());

  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RELEASED);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 2);
  assert.equal(context.productRepository.products.get(PRODUCT_B)?.stock, 1);
  assert.equal(
    context.productRepository.restoreAttempts.filter(
      (attempt) => attempt.productId === PRODUCT_B
    ).length,
    2
  );
});

test('simultaneous cancellation requests restore stock once and release inventory', async () => {
  const order = createOrderRecord({ items: [createItem(PRODUCT_A, 2)] });
  const context = setup([order]);

  const results = await Promise.allSettled([
    context.service.cancelOrder(order._id.toString()),
    context.service.cancelOrder(order._id.toString()),
  ]);

  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 2);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 2);
  assert.equal(order.status, ORDER_STATUSES.CANCELLED);
  assert.equal(order.inventoryStatus, INVENTORY_STATUSES.RELEASED);
});

test('conflicting simultaneous status transitions allow only one to succeed', async () => {
  const order = createOrderRecord();
  const context = setup([order]);

  const results = await Promise.allSettled([
    context.service.updateOrderStatus(order._id.toString(), ORDER_STATUSES.CONFIRMED),
    context.service.updateOrderStatus(
      order._id.toString(),
      ORDER_STATUSES.CANCELLED
    ),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);

  if (rejected[0].status === 'rejected') {
    const reason: unknown = rejected[0].reason;
    assert.ok(reason instanceof AppError);
    assert.equal(reason.statusCode, 409);
  }
});

test('non-cancellation transitions never restore inventory', async () => {
  const order = createOrderRecord({ items: [createItem(PRODUCT_A, 2)] });
  const context = setup([order]);

  await context.service.updateOrderStatus(order._id.toString(), ORDER_STATUSES.CONFIRMED);
  await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.PROCESSING
  );
  await context.service.updateOrderStatus(order._id.toString(), ORDER_STATUSES.SHIPPED);
  const result = await context.service.updateOrderStatus(
    order._id.toString(),
    ORDER_STATUSES.DELIVERED
  );

  assert.equal(result.status, ORDER_STATUSES.DELIVERED);
  assert.equal(result.inventoryStatus, INVENTORY_STATUSES.RESERVED);
  assert.equal(context.productRepository.restoreAttempts.length, 0);
  assert.equal(context.productRepository.products.get(PRODUCT_A)?.stock, 0);
});

test('restoreStockOnce atomically increments stock and records the operation key', async () => {
  const originalFindOneAndUpdate = ProductModel.findOneAndUpdate;
  let capturedFilter: Record<string, unknown> | undefined;
  let capturedUpdate: Record<string, unknown> | undefined;
  const key = 'order-cancel:order-1:product-1';
  const updatedProduct = {
    _id: new Types.ObjectId(PRODUCT_A),
  } as unknown as ProductDocument;

  try {
    ProductModel.findOneAndUpdate = ((
      filter: Record<string, unknown>,
      update: Record<string, unknown>
    ) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { exec: async () => updatedProduct };
    }) as unknown as typeof ProductModel.findOneAndUpdate;

    const repository = new MongooseProductRepository();
    const result = await repository.restoreStockOnce(PRODUCT_A, 2, key);

    assert.equal(result.status, STOCK_RESTORATION_STATUSES.APPLIED);
    assert.equal(result.product, updatedProduct);

    if (!capturedFilter || !capturedUpdate) {
      assert.fail('Expected findOneAndUpdate to be called');
    }

    assert.equal(capturedFilter._id, PRODUCT_A);
    assert.deepEqual(capturedFilter.stockRestorationKeys, { $ne: key });
    assert.deepEqual(capturedUpdate, {
      $inc: { stock: 2 },
      $addToSet: { stockRestorationKeys: key },
    });
  } finally {
    ProductModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('restoreStockOnce returns ALREADY_APPLIED when the operation key exists', async () => {
  const originalFindOneAndUpdate = ProductModel.findOneAndUpdate;
  const originalFindById = ProductModel.findById;
  const key = 'order-cancel:order-1:product-1';
  const existingProduct = {
    _id: new Types.ObjectId(PRODUCT_A),
  } as unknown as ProductDocument;

  try {
    ProductModel.findOneAndUpdate = (() => ({
      exec: async () => null,
    })) as unknown as typeof ProductModel.findOneAndUpdate;
    ProductModel.findById = (() => ({
      exec: async () => existingProduct,
    })) as unknown as typeof ProductModel.findById;

    const repository = new MongooseProductRepository();
    const result = await repository.restoreStockOnce(PRODUCT_A, 2, key);

    assert.equal(result.status, STOCK_RESTORATION_STATUSES.ALREADY_APPLIED);
    assert.equal(result.product, existingProduct);
  } finally {
    ProductModel.findOneAndUpdate = originalFindOneAndUpdate;
    ProductModel.findById = originalFindById;
  }
});

test('restoreStockOnce returns PRODUCT_NOT_FOUND for a missing product', async () => {
  const originalFindOneAndUpdate = ProductModel.findOneAndUpdate;
  const originalFindById = ProductModel.findById;

  try {
    ProductModel.findOneAndUpdate = (() => ({
      exec: async () => null,
    })) as unknown as typeof ProductModel.findOneAndUpdate;
    ProductModel.findById = (() => ({
      exec: async () => null,
    })) as unknown as typeof ProductModel.findById;

    const repository = new MongooseProductRepository();
    const result = await repository.restoreStockOnce(
      PRODUCT_A,
      2,
      'order-cancel:order-1:product-1'
    );

    assert.equal(result.status, STOCK_RESTORATION_STATUSES.PRODUCT_NOT_FOUND);
    assert.equal(result.product, null);
  } finally {
    ProductModel.findOneAndUpdate = originalFindOneAndUpdate;
    ProductModel.findById = originalFindById;
  }
});

test('restoreStockOnce does not filter by product status so inactive products are restored', async () => {
  const originalFindOneAndUpdate = ProductModel.findOneAndUpdate;
  let capturedFilter: Record<string, unknown> | undefined;
  const inactiveProduct = {
    _id: new Types.ObjectId(PRODUCT_A),
    status: PRODUCT_STATUSES.INACTIVE,
  } as unknown as ProductDocument;

  try {
    ProductModel.findOneAndUpdate = ((
      filter: Record<string, unknown>
    ) => {
      capturedFilter = filter;
      return { exec: async () => inactiveProduct };
    }) as unknown as typeof ProductModel.findOneAndUpdate;

    const repository = new MongooseProductRepository();
    const result = await repository.restoreStockOnce(
      PRODUCT_A,
      1,
      'order-cancel:order-1:product-1'
    );

    assert.equal(result.status, STOCK_RESTORATION_STATUSES.APPLIED);

    if (!capturedFilter) {
      assert.fail('Expected findOneAndUpdate to be called');
    }

    assert.equal('status' in capturedFilter, false);
  } finally {
    ProductModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
