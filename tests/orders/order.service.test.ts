import assert from 'node:assert/strict';
import test from 'node:test';
import { Types } from 'mongoose';
import { OrderService } from '../../src/modules/orders/order.service';
import {
  CreateOrderData,
  OrderDocument,
  OrderItemInput,
  OrderProductRepository,
  OrderRepository,
} from '../../src/modules/orders/order.types';
import { createOrderSchema } from '../../src/modules/orders/order.validation';
import { ProductModel } from '../../src/modules/products/product.model';
import { MongooseProductRepository } from '../../src/modules/products/product.repository';
import {
  PRODUCT_STATUSES,
  ProductDocument,
  ProductId,
  ProductStatus,
} from '../../src/modules/products/product.types';
import { AppError } from '../../src/shared/errors/app-error';
import {
  multiplyPaise,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from '../../src/shared/utils/money.util';

const CUSTOMER_ID = '665f1b2c9a1b2c3d4e5f6789';
const PRODUCT_A = '665f1b2c9a1b2c3d4e5f6795';
const PRODUCT_B = '665f191e810c19729de860ea';

interface FakeProductRecord {
  _id: Types.ObjectId;
  name: string;
  sku: string;
  price: number;
  salePrice: number | null;
  stock: number;
  status: ProductStatus;
}

const createFakeProduct = (
  id: string,
  overrides: Partial<Omit<FakeProductRecord, '_id'>> = {}
): FakeProductRecord => ({
  _id: new Types.ObjectId(id),
  name: 'Samsung Galaxy S24',
  sku: 'SAMSUNG-S24',
  price: 74999.99,
  salePrice: null,
  stock: 10,
  status: PRODUCT_STATUSES.ACTIVE,
  ...overrides,
});

const item = (productId: string, quantity: number): OrderItemInput => ({
  productId,
  quantity,
});

class FakeProductRepository implements OrderProductRepository {
  public readonly products = new Map<string, FakeProductRecord>();
  public readonly restoreCalls: Array<{ productId: string; quantity: number }> = [];
  public readonly forcedReservationFailures = new Set<string>();
  public readonly failedRestoreIds = new Set<string>();

  constructor(products: FakeProductRecord[]) {
    for (const product of products) {
      this.products.set(product._id.toString(), product);
    }
  }

  public async findActiveByIds(productIds: ProductId[]): Promise<ProductDocument[]> {
    return productIds
      .map((productId) => this.products.get(productId.toString()))
      .filter(
        (product): product is FakeProductRecord =>
          product !== undefined && product.status === PRODUCT_STATUSES.ACTIVE
      )
      .map((product) => product as unknown as ProductDocument);
  }

  public async reserveStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument | null> {
    const id = productId.toString();

    if (this.forcedReservationFailures.has(id)) {
      return null;
    }

    const product = this.products.get(id);

    if (
      !product ||
      product.status !== PRODUCT_STATUSES.ACTIVE ||
      product.stock < quantity
    ) {
      return null;
    }

    product.stock -= quantity;
    return product as unknown as ProductDocument;
  }

  public async restoreStock(
    productId: ProductId,
    quantity: number
  ): Promise<ProductDocument> {
    const id = productId.toString();
    this.restoreCalls.push({ productId: id, quantity });

    if (this.failedRestoreIds.has(id)) {
      throw new Error('Simulated stock restoration failure');
    }

    const product = this.products.get(id);

    if (!product) {
      throw new Error('Simulated missing product during restoration');
    }

    product.stock += quantity;
    return product as unknown as ProductDocument;
  }
}

class FakeOrderRepository implements OrderRepository {
  public readonly orders: OrderDocument[] = [];
  public readonly createCalls: CreateOrderData[] = [];
  public shouldFailCreate = false;

  public async create(orderData: CreateOrderData): Promise<OrderDocument> {
    this.createCalls.push(orderData);

    if (this.shouldFailCreate) {
      throw new Error('Simulated order persistence failure');
    }

    const now = new Date();
    const order = {
      _id: new Types.ObjectId(),
      ...orderData,
      createdAt: now,
      updatedAt: now,
    } as unknown as OrderDocument;

    this.orders.push(order);
    return order;
  }

  public async findById(orderId: string | Types.ObjectId): Promise<OrderDocument | null> {
    return (
      this.orders.find((order) => order._id.toString() === orderId.toString()) ?? null
    );
  }

  public async findByIdAndCustomerId(
    orderId: string | Types.ObjectId,
    customerId: string | Types.ObjectId
  ): Promise<OrderDocument | null> {
    return (
      this.orders.find(
        (order) =>
          order._id.toString() === orderId.toString() &&
          order.customerId.toString() === customerId.toString()
      ) ?? null
    );
  }
}

interface TestContext {
  service: OrderService;
  productRepository: FakeProductRepository;
  orderRepository: FakeOrderRepository;
}

const setup = (products: FakeProductRecord[]): TestContext => {
  const productRepository = new FakeProductRepository(products);
  const orderRepository = new FakeOrderRepository();
  const service = new OrderService({ productRepository, orderRepository });

  return { service, productRepository, orderRepository };
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

test('creates an order for a single product with a historical snapshot', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 79999.99,
    salePrice: 74999.99,
    stock: 5,
  });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 2)]);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].productId, PRODUCT_A);
  assert.equal(result.items[0].name, 'Samsung Galaxy S24');
  assert.equal(result.items[0].sku, 'SAMSUNG-S24');
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].unitPrice, 74999.99);
  assert.equal(result.items[0].lineTotal, 149999.98);
  assert.equal(result.subtotal, 149999.98);
  assert.equal(result.total, 149999.98);
  assert.equal(result.currency, 'INR');
  assert.equal(result.status, 'PENDING');
  assert.equal(product.stock, 3);
  assert.equal(context.orderRepository.orders.length, 1);
  assert.equal(context.productRepository.restoreCalls.length, 0);
});

test('creates an order with multiple products', async () => {
  const productA = createFakeProduct(PRODUCT_A, {
    price: 100,
    salePrice: null,
    stock: 10,
  });
  const productB = createFakeProduct(PRODUCT_B, {
    name: 'Apple iPhone 15',
    sku: 'APPLE-IPHONE-15',
    price: 1999.99,
    salePrice: 1499.99,
    stock: 5,
  });
  const context = setup([productA, productB]);

  const result = await context.service.createOrder(CUSTOMER_ID, [
    item(PRODUCT_A, 2),
    item(PRODUCT_B, 1),
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].lineTotal, 200);
  assert.equal(result.items[1].unitPrice, 1499.99);
  assert.equal(result.items[1].lineTotal, 1499.99);
  assert.equal(result.subtotal, 1699.99);
  assert.equal(result.total, 1699.99);
  assert.equal(productA.stock, 8);
  assert.equal(productB.stock, 4);
});

test('aggregates duplicate product IDs into a single reservation and line item', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 10,
    salePrice: null,
    stock: 10,
  });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [
    item(PRODUCT_A, 2),
    item(PRODUCT_A, 3),
  ]);

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 5);
  assert.equal(result.items[0].lineTotal, 50);
  assert.equal(result.subtotal, 50);
  assert.equal(product.stock, 5);
});

test('uses salePrice when it is available', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 100,
    salePrice: 80,
    stock: 5,
  });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 2)]);

  assert.equal(result.items[0].unitPrice, 80);
  assert.equal(result.items[0].lineTotal, 160);
  assert.equal(result.total, 160);
});

test('uses regular price when salePrice is null', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 100,
    salePrice: null,
    stock: 5,
  });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 2)]);

  assert.equal(result.items[0].unitPrice, 100);
  assert.equal(result.items[0].lineTotal, 200);
  assert.equal(result.total, 200);
});

test('rejects client-supplied prices and identity fields', async () => {
  const invalidPayloads: unknown[] = [
    { items: [{ productId: PRODUCT_A, quantity: 1, price: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, salePrice: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, unitPrice: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, total: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, subtotal: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, stock: 1 }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, currency: 'INR' }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, status: 'CONFIRMED' }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, inventoryStatus: 'RELEASED' }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, orderId: PRODUCT_A }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, customerId: CUSTOMER_ID }] },
    { items: [{ productId: PRODUCT_A, quantity: 1, userId: CUSTOMER_ID }] },
    { customerId: CUSTOMER_ID, items: [{ productId: PRODUCT_A, quantity: 1 }] },
  ];

  for (const payload of invalidPayloads) {
    assert.equal(createOrderSchema.safeParse(payload).success, false);
  }

  const product = createFakeProduct(PRODUCT_A, {
    price: 100,
    salePrice: null,
    stock: 5,
  });
  const context = setup([product]);
  const clientPricedItem = {
    productId: PRODUCT_A,
    quantity: 2,
    price: 1,
  } as unknown as OrderItemInput;

  const result = await context.service.createOrder(CUSTOMER_ID, [clientPricedItem]);

  assert.equal(result.items[0].unitPrice, 100);
  assert.equal(result.total, 200);
});

test('calculates integer paise accurately for two-decimal prices', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 1999.99,
    salePrice: null,
    stock: 5,
  });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 3)]);

  assert.equal(result.items[0].unitPrice, 1999.99);
  assert.equal(result.items[0].lineTotal, 5999.97);
  assert.equal(result.subtotal, 5999.97);
  assert.equal(result.total, 5999.97);
  assert.equal(context.orderRepository.createCalls[0].items[0].unitPricePaise, 199999);
  assert.equal(context.orderRepository.createCalls[0].items[0].lineTotalPaise, 599997);
  assert.equal(context.orderRepository.createCalls[0].subtotalPaise, 599997);
});

test('rejects unsafe monetary amounts without reserving stock', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    price: 1e16,
    salePrice: null,
    stock: 10,
  });
  const context = setup([product]);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 1)]),
    500,
    'INTERNAL_SERVER_ERROR'
  );

  assert.equal(product.stock, 10);
  assert.equal(context.productRepository.restoreCalls.length, 0);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('rejects a missing product', async () => {
  const context = setup([]);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 1)]),
    404,
    'PRODUCT_NOT_AVAILABLE'
  );

  assert.equal(context.orderRepository.orders.length, 0);
});

test('rejects an inactive product', async () => {
  const product = createFakeProduct(PRODUCT_A, {
    stock: 10,
    status: PRODUCT_STATUSES.INACTIVE,
  });
  const context = setup([product]);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 1)]),
    404,
    'PRODUCT_NOT_AVAILABLE'
  );

  assert.equal(product.stock, 10);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('rejects insufficient stock without deducting', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 1 });
  const context = setup([product]);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 2)]),
    409,
    'INSUFFICIENT_STOCK'
  );

  assert.equal(product.stock, 1);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('restores earlier reservations when a later reservation fails', async () => {
  const productA = createFakeProduct(PRODUCT_A, { stock: 10 });
  const productB = createFakeProduct(PRODUCT_B, { stock: 10 });
  const context = setup([productA, productB]);
  context.productRepository.forcedReservationFailures.add(PRODUCT_B);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [
      item(PRODUCT_A, 2),
      item(PRODUCT_B, 1),
    ]),
    409,
    'INSUFFICIENT_STOCK'
  );

  assert.equal(productA.stock, 10);
  assert.equal(productB.stock, 10);
  assert.equal(context.productRepository.restoreCalls.length, 1);
  assert.equal(context.productRepository.restoreCalls[0].productId, PRODUCT_A);
  assert.equal(context.productRepository.restoreCalls[0].quantity, 2);
  assert.equal(context.orderRepository.createCalls.length, 0);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('restores every reservation when order persistence fails', async () => {
  const productA = createFakeProduct(PRODUCT_A, { stock: 10 });
  const productB = createFakeProduct(PRODUCT_B, { stock: 10 });
  const context = setup([productA, productB]);
  context.orderRepository.shouldFailCreate = true;

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [
      item(PRODUCT_A, 2),
      item(PRODUCT_B, 3),
    ]),
    500,
    'INTERNAL_SERVER_ERROR'
  );

  assert.equal(productA.stock, 10);
  assert.equal(productB.stock, 10);
  assert.equal(context.productRepository.restoreCalls.length, 2);
  assert.equal(context.productRepository.restoreCalls[0].productId, PRODUCT_B);
  assert.equal(context.productRepository.restoreCalls[1].productId, PRODUCT_A);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('reports CHECKOUT_COMPENSATION_FAILED when restoration fails', async () => {
  const productA = createFakeProduct(PRODUCT_A, { stock: 10 });
  const productB = createFakeProduct(PRODUCT_B, { stock: 10 });
  const context = setup([productA, productB]);
  context.productRepository.forcedReservationFailures.add(PRODUCT_B);
  context.productRepository.failedRestoreIds.add(PRODUCT_A);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [
      item(PRODUCT_A, 2),
      item(PRODUCT_B, 1),
    ]),
    500,
    'CHECKOUT_COMPENSATION_FAILED'
  );

  assert.equal(productA.stock, 8);
  assert.equal(productB.stock, 10);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('does not restore stock after a successful checkout', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 10 });
  const context = setup([product]);

  const result = await context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 4)]);

  assert.equal(result.items[0].quantity, 4);
  assert.equal(product.stock, 6);
  assert.equal(context.productRepository.restoreCalls.length, 0);
  assert.equal(context.orderRepository.orders.length, 1);
});

test('prevents overselling during concurrent checkout attempts', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 1 });
  const context = setup([product]);

  const results = await Promise.allSettled([
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 1)]),
    context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, 1)]),
  ]);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(product.stock, 0);
  assert.equal(context.orderRepository.orders.length, 1);

  if (rejected[0].status === 'rejected') {
    const reason: unknown = rejected[0].reason;
    assert.ok(reason instanceof AppError);
    assert.equal(reason.code, 'INSUFFICIENT_STOCK');
  }
});

test('rejects invalid quantities', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 10000 });
  const context = setup([product]);
  const invalidQuantities = [0, -1, 1.5, 1001, Number.NaN];

  for (const quantity of invalidQuantities) {
    await expectAppError(
      context.service.createOrder(CUSTOMER_ID, [item(PRODUCT_A, quantity)]),
      422,
      'VALIDATION_ERROR'
    );
  }

  assert.equal(product.stock, 10000);
  assert.equal(context.orderRepository.orders.length, 0);
});

test('rejects an aggregated duplicate quantity above the per-product maximum', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 5000 });
  const context = setup([product]);

  await expectAppError(
    context.service.createOrder(CUSTOMER_ID, [
      item(PRODUCT_A, 600),
      item(PRODUCT_A, 600),
    ]),
    422,
    'VALIDATION_ERROR'
  );

  assert.equal(product.stock, 5000);
  assert.equal(context.productRepository.restoreCalls.length, 0);
  assert.equal(context.orderRepository.createCalls.length, 0);
});

test('uses the authenticated customer ID instead of client-supplied identity', async () => {
  const product = createFakeProduct(PRODUCT_A, { stock: 10 });
  const context = setup([product]);
  const spoofedItem = {
    productId: PRODUCT_A,
    quantity: 1,
    customerId: '665f1b2c9a1b2c3d4e5f6700',
    userId: '665f1b2c9a1b2c3d4e5f6701',
  } as unknown as OrderItemInput;

  await context.service.createOrder(CUSTOMER_ID, [spoofedItem]);

  assert.equal(
    context.orderRepository.createCalls[0].customerId.toString(),
    CUSTOMER_ID
  );
  assert.equal(
    createOrderSchema.safeParse({
      customerId: CUSTOMER_ID,
      items: [{ productId: PRODUCT_A, quantity: 1 }],
    }).success,
    false
  );
  assert.equal(
    createOrderSchema.safeParse({
      items: [{ productId: PRODUCT_A, quantity: 1, customerId: CUSTOMER_ID }],
    }).success,
    false
  );
});

test('reserveStock builds one atomic conditional stock decrement', async () => {
  const originalFindOneAndUpdate = ProductModel.findOneAndUpdate;
  let capturedFilter: Record<string, unknown> | undefined;
  let capturedUpdate: Record<string, unknown> | undefined;

  try {
    ProductModel.findOneAndUpdate = ((
      filter: Record<string, unknown>,
      update: Record<string, unknown>
    ) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { exec: async () => null };
    }) as unknown as typeof ProductModel.findOneAndUpdate;

    const repository = new MongooseProductRepository();
    const result = await repository.reserveStock(PRODUCT_A, 2);

    assert.equal(result, null);

    if (!capturedFilter || !capturedUpdate) {
      assert.fail('Expected findOneAndUpdate to be called');
    }

    assert.equal(capturedFilter._id, PRODUCT_A);
    assert.equal(capturedFilter.status, PRODUCT_STATUSES.ACTIVE);
    assert.deepEqual(capturedFilter.stock, { $gte: 2 });
    assert.deepEqual(capturedUpdate, { $inc: { stock: -2 } });
  } finally {
    ProductModel.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test('converts INR to integer paise and back without precision drift', () => {
  assert.equal(rupeesToPaise(100), 10000);
  assert.equal(rupeesToPaise(1999.99), 199999);
  assert.equal(rupeesToPaise(74999.99), 7499999);
  assert.equal(paiseToRupees(7499999), 74999.99);
  assert.equal(paiseToRupees(14999998), 149999.98);
  assert.throws(() => rupeesToPaise(1.234), RangeError);
  assert.throws(() => rupeesToPaise(-1), RangeError);
  assert.throws(() => rupeesToPaise(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => paiseToRupees(1.5), RangeError);
});

test('protects paise multiplication and accumulation from overflow', () => {
  assert.equal(multiplyPaise(199999, 3), 599997);
  assert.equal(sumPaise([599997, 200]), 600197);
  assert.throws(() => multiplyPaise(Number.MAX_SAFE_INTEGER, 2), RangeError);
  assert.throws(() => sumPaise([Number.MAX_SAFE_INTEGER, 1]), RangeError);
});

