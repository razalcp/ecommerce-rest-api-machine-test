import { Types } from 'mongoose';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import {
  multiplyPaise,
  paiseToRupees,
  rupeesToPaise,
  sumPaise,
} from '../../shared/utils/money.util';
import { productRepository } from '../products/product.repository';
import {
  PRODUCT_STATUSES,
  ProductDocument,
  ProductId,
  STOCK_RESTORATION_STATUSES,
} from '../products/product.types';
import { orderRepository } from './order.repository';
import {
  CompensationResult,
  CreateOrderData,
  INVENTORY_STATUSES,
  isOrderStatusTransitionAllowed,
  OrderAdminListQuery,
  OrderCustomerListQuery,
  OrderDocument,
  OrderItem,
  OrderItemInput,
  OrderPaginationMetadata,
  ORDER_CURRENCIES,
  ORDER_STATUSES,
  OrderProductRepository,
  OrderRepository,
  OrderStatus,
  PaginatedOrderResult,
  PaginatedSafeAdminOrderResponse,
  PaginatedSafeOrderResponse,
  SafeAdminOrderResponse,
  SafeOrderResponse,
  StockReservation,
} from './order.types';

const MAX_SUBMITTED_LINES = 50;
const MAX_QUANTITY_PER_PRODUCT = 1000;
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const PRODUCT_NOT_AVAILABLE_MESSAGE = 'Product is not available';
const INSUFFICIENT_STOCK_MESSAGE = 'Insufficient stock for one or more products';
const INVALID_ITEMS_MESSAGE = 'Order items are invalid';
const CHECKOUT_FAILED_MESSAGE = 'Order checkout failed';
const COMPENSATION_FAILED_MESSAGE = 'Order checkout could not be completed safely';
const PRICING_UNAVAILABLE_MESSAGE = 'Product pricing is unavailable';
const ORDER_NOT_FOUND_MESSAGE = 'Order not found';
const INVENTORY_RESTORATION_FAILED_MESSAGE =
  'Order was cancelled, but inventory restoration is incomplete. Please retry.';

interface NormalizedOrderItem {
  productId: Types.ObjectId;
  quantity: number;
}

interface ValidatedOrderItem {
  item: NormalizedOrderItem;
  product: ProductDocument;
}

interface OrderSummary {
  items: OrderItem[];
  subtotalPaise: number;
  totalPaise: number;
}

interface RestorationItem {
  productId: Types.ObjectId;
  quantity: number;
}

export interface OrderServiceDependencies {
  productRepository: OrderProductRepository;
  orderRepository: OrderRepository;
}

const productNotAvailableError = (): AppError =>
  new AppError(
    PRODUCT_NOT_AVAILABLE_MESSAGE,
    HttpStatus.NOT_FOUND,
    'PRODUCT_NOT_AVAILABLE'
  );

const insufficientStockError = (): AppError =>
  new AppError(
    INSUFFICIENT_STOCK_MESSAGE,
    HttpStatus.CONFLICT,
    'INSUFFICIENT_STOCK'
  );

const invalidItemsError = (message: string = INVALID_ITEMS_MESSAGE): AppError =>
  new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, 'VALIDATION_ERROR');

const orderNotFoundError = (): AppError =>
  new AppError(ORDER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');

const invalidOrderStatusTransitionError = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): AppError =>
  new AppError(
    `Cannot change order status from ${currentStatus} to ${nextStatus}`,
    HttpStatus.CONFLICT,
    'INVALID_ORDER_STATUS_TRANSITION'
  );

const orderStatusConflictError = (): AppError =>
  new AppError(
    'Order status changed concurrently. Please retry.',
    HttpStatus.CONFLICT,
    'ORDER_STATUS_CONFLICT'
  );

const invalidInventoryStateError = (): AppError =>
  new AppError(
    'Order inventory state cannot be cancelled',
    HttpStatus.CONFLICT,
    'INVALID_INVENTORY_STATE'
  );

const inventoryRestorationFailedError = (): AppError =>
  new AppError(
    INVENTORY_RESTORATION_FAILED_MESSAGE,
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INVENTORY_RESTORATION_FAILED'
  );

const toObjectIdString = (productId: ProductId): string => productId.toString();

const getEffectiveUnitPricePaise = (product: ProductDocument): number => {
  const effectivePrice = product.salePrice !== null ? product.salePrice : product.price;

  if (effectivePrice <= 0) {
    throw new AppError(
      PRICING_UNAVAILABLE_MESSAGE,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }

  try {
    return rupeesToPaise(effectivePrice);
  } catch {
    throw new AppError(
      PRICING_UNAVAILABLE_MESSAGE,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

const multiplyPaiseSafely = (unitPricePaise: number, quantity: number): number => {
  try {
    return multiplyPaise(unitPricePaise, quantity);
  } catch {
    throw new AppError(
      PRICING_UNAVAILABLE_MESSAGE,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

const sumPaiseSafely = (values: readonly number[]): number => {
  try {
    return sumPaise(values);
  } catch {
    throw new AppError(
      PRICING_UNAVAILABLE_MESSAGE,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }
};

const normalizeItems = (items: OrderItemInput[]): NormalizedOrderItem[] => {
  if (!Array.isArray(items) || items.length === 0) {
    throw invalidItemsError('At least one order item is required');
  }

  if (items.length > MAX_SUBMITTED_LINES) {
    throw invalidItemsError(
      `An order must not contain more than ${MAX_SUBMITTED_LINES} item lines`
    );
  }

  const aggregated = new Map<string, NormalizedOrderItem>();

  for (const item of items) {
    if (
      typeof item?.productId !== 'string' ||
      !OBJECT_ID_PATTERN.test(item.productId)
    ) {
      throw invalidItemsError('Product ID must be a valid MongoDB ObjectId');
    }

    if (
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      item.quantity > MAX_QUANTITY_PER_PRODUCT
    ) {
      throw invalidItemsError(
        `Quantity must be a positive integer between 1 and ${MAX_QUANTITY_PER_PRODUCT}`
      );
    }

    const productId = new Types.ObjectId(item.productId);
    const key = productId.toHexString();
    const existing = aggregated.get(key);

    if (existing) {
      const aggregatedQuantity = existing.quantity + item.quantity;

      if (
        !Number.isSafeInteger(aggregatedQuantity) ||
        aggregatedQuantity > MAX_QUANTITY_PER_PRODUCT
      ) {
        throw invalidItemsError(
          `Aggregated quantity for a product must not exceed ${MAX_QUANTITY_PER_PRODUCT}`
        );
      }

      existing.quantity = aggregatedQuantity;
    } else {
      aggregated.set(key, { productId, quantity: item.quantity });
    }
  }

  return [...aggregated.values()];
};

const toSafeOrderResponse = (order: OrderDocument): SafeOrderResponse => ({
  id: order._id.toString(),
  items: order.items.map((item) => ({
    productId: item.productId.toString(),
    name: item.name,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: paiseToRupees(item.unitPricePaise),
    lineTotal: paiseToRupees(item.lineTotalPaise),
  })),
  subtotal: paiseToRupees(order.subtotalPaise),
  total: paiseToRupees(order.totalPaise),
  currency: order.currency,
  status: order.status,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
});

const toSafeAdminOrderResponse = (
  order: OrderDocument
): SafeAdminOrderResponse => ({
  ...toSafeOrderResponse(order),
  customerId: order.customerId.toString(),
  inventoryStatus: order.inventoryStatus,
});

const toPaginationMetadata = (
  result: PaginatedOrderResult
): OrderPaginationMetadata => ({
  page: result.page,
  limit: result.limit,
  total: result.total,
  totalPages: result.totalPages,
});

const toRestorationItems = (items: OrderItem[]): RestorationItem[] => {
  const quantitiesByProduct = new Map<string, RestorationItem>();

  for (const item of items) {
    const productId = item.productId.toHexString();
    const existing = quantitiesByProduct.get(productId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      quantitiesByProduct.set(productId, {
        productId: item.productId,
        quantity: item.quantity,
      });
    }
  }

  return [...quantitiesByProduct.values()];
};

const toCancellationOperationKey = (
  orderId: string,
  productId: string
): string => `order-cancel:${orderId}:${productId}`;

export class OrderService {
  constructor(private readonly dependencies: OrderServiceDependencies) {}

  public async createOrder(
    customerId: string,
    items: OrderItemInput[]
  ): Promise<SafeOrderResponse> {
    if (!OBJECT_ID_PATTERN.test(customerId)) {
      throw new AppError(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const normalizedItems = normalizeItems(items);
    const validatedItems = await this.preValidateProducts(normalizedItems);
    const reservations: StockReservation[] = [];

    try {
      for (const validatedItem of validatedItems) {
        const product = await this.dependencies.productRepository.reserveStock(
          validatedItem.item.productId,
          validatedItem.item.quantity
        );

        if (!product) {
          throw await this.resolveReservationFailure(validatedItem.item);
        }

        reservations.push({
          productId: validatedItem.item.productId,
          quantity: validatedItem.item.quantity,
          product,
        });
      }
    } catch (error) {
      return this.compensateAndRethrow(reservations, this.toCheckoutError(error));
    }

    let summary: OrderSummary;

    try {
      summary = this.buildOrderSummary(reservations);
    } catch (error) {
      return this.compensateAndRethrow(reservations, this.toCheckoutError(error));
    }

    const orderData: CreateOrderData = {
      customerId: new Types.ObjectId(customerId),
      items: summary.items,
      subtotalPaise: summary.subtotalPaise,
      totalPaise: summary.totalPaise,
      currency: ORDER_CURRENCIES.INR,
      status: ORDER_STATUSES.PENDING,
      inventoryStatus: INVENTORY_STATUSES.RESERVED,
    };

    let order: OrderDocument;

    try {
      order = await this.dependencies.orderRepository.create(orderData);
    } catch (error) {
      return this.compensateAndRethrow(reservations, this.toCheckoutError(error));
    }

    return toSafeOrderResponse(order);
  }

  public async getCustomerOrders(
    customerId: string,
    query: OrderCustomerListQuery
  ): Promise<PaginatedSafeOrderResponse> {
    if (!OBJECT_ID_PATTERN.test(customerId)) {
      throw new AppError(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const result = await this.dependencies.orderRepository.findCustomerOrders(
      customerId,
      { page: query.page, limit: query.limit }
    );

    return {
      orders: result.orders.map(toSafeOrderResponse),
      pagination: toPaginationMetadata(result),
    };
  }

  public async getCustomerOrderById(
    customerId: string,
    orderId: string
  ): Promise<SafeOrderResponse> {
    if (!OBJECT_ID_PATTERN.test(customerId)) {
      throw new AppError(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const order = await this.dependencies.orderRepository.findByIdAndCustomerId(
      orderId,
      customerId
    );

    if (!order) {
      throw orderNotFoundError();
    }

    return toSafeOrderResponse(order);
  }

  public async getAdminOrders(
    query: OrderAdminListQuery
  ): Promise<PaginatedSafeAdminOrderResponse> {
    const result = await this.dependencies.orderRepository.findAllAdminOrders(
      {
        status: query.status,
        customerId: query.customerId,
      },
      { page: query.page, limit: query.limit }
    );

    return {
      orders: result.orders.map(toSafeAdminOrderResponse),
      pagination: toPaginationMetadata(result),
    };
  }

  public async getAdminOrderById(orderId: string): Promise<SafeAdminOrderResponse> {
    const order = await this.findOrderOrThrow(orderId);
    return toSafeAdminOrderResponse(order);
  }

  public async updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus
  ): Promise<SafeAdminOrderResponse> {
    const order = await this.findOrderOrThrow(orderId);

    if (nextStatus === ORDER_STATUSES.CANCELLED) {
      if (order.status === ORDER_STATUSES.CANCELLED) {
        return this.cancelOrder(orderId);
      }

      if (!isOrderStatusTransitionAllowed(order.status, nextStatus)) {
        throw invalidOrderStatusTransitionError(order.status, nextStatus);
      }

      return this.cancelOrder(orderId, order.status);
    }

    if (!isOrderStatusTransitionAllowed(order.status, nextStatus)) {
      throw invalidOrderStatusTransitionError(order.status, nextStatus);
    }

    const updatedOrder =
      await this.dependencies.orderRepository.updateStatusIfCurrent(
        orderId,
        order.status,
        nextStatus
      );

    if (!updatedOrder) {
      const currentOrder = await this.dependencies.orderRepository.findById(orderId);

      if (!currentOrder) {
        throw orderNotFoundError();
      }

      throw orderStatusConflictError();
    }

    return toSafeAdminOrderResponse(updatedOrder);
  }

  public async cancelOrder(
    orderId: string,
    expectedStatus?: OrderStatus
  ): Promise<SafeAdminOrderResponse> {
    if (expectedStatus) {
      const cancellation =
        await this.dependencies.orderRepository.beginCancellation(
          orderId,
          expectedStatus
        );

      if (!cancellation) {
        return this.resolveFailedCancellation(orderId);
      }

      return this.restoreCancelledOrder(cancellation);
    }

    const order = await this.findOrderOrThrow(orderId);

    if (order.status === ORDER_STATUSES.CANCELLED) {
      if (order.inventoryStatus === INVENTORY_STATUSES.RELEASED) {
        return toSafeAdminOrderResponse(order);
      }

      if (order.inventoryStatus === INVENTORY_STATUSES.RESTORING) {
        return this.restoreCancelledOrder(order);
      }

      throw invalidInventoryStateError();
    }

    if (!isOrderStatusTransitionAllowed(order.status, ORDER_STATUSES.CANCELLED)) {
      throw invalidOrderStatusTransitionError(
        order.status,
        ORDER_STATUSES.CANCELLED
      );
    }

    const cancellation =
      await this.dependencies.orderRepository.beginCancellation(
        orderId,
        order.status
      );

    if (!cancellation) {
      return this.resolveFailedCancellation(orderId);
    }

    return this.restoreCancelledOrder(cancellation);
  }

  private async resolveFailedCancellation(
    orderId: string
  ): Promise<SafeAdminOrderResponse> {
    const currentOrder = await this.dependencies.orderRepository.findById(orderId);

    if (!currentOrder) {
      throw orderNotFoundError();
    }

    if (currentOrder.status === ORDER_STATUSES.CANCELLED) {
      if (currentOrder.inventoryStatus === INVENTORY_STATUSES.RELEASED) {
        return toSafeAdminOrderResponse(currentOrder);
      }

      if (currentOrder.inventoryStatus === INVENTORY_STATUSES.RESTORING) {
        return this.restoreCancelledOrder(currentOrder);
      }

      throw invalidInventoryStateError();
    }

    if (
      !isOrderStatusTransitionAllowed(currentOrder.status, ORDER_STATUSES.CANCELLED)
    ) {
      throw invalidOrderStatusTransitionError(
        currentOrder.status,
        ORDER_STATUSES.CANCELLED
      );
    }

    throw orderStatusConflictError();
  }

  private async findOrderOrThrow(orderId: string): Promise<OrderDocument> {
    const order = await this.dependencies.orderRepository.findById(orderId);

    if (!order) {
      throw orderNotFoundError();
    }

    return order;
  }

  private async restoreCancelledOrder(
    order: OrderDocument
  ): Promise<SafeAdminOrderResponse> {
    const restorationItems = toRestorationItems(order.items);
    const failures: string[] = [];
    const orderId = order._id.toString();

    for (const item of restorationItems) {
      const productId = item.productId.toString();

      try {
        const result = await this.dependencies.productRepository.restoreStockOnce(
          item.productId,
          item.quantity,
          toCancellationOperationKey(orderId, productId)
        );

        if (result.status === STOCK_RESTORATION_STATUSES.PRODUCT_NOT_FOUND) {
          failures.push(`${productId}:${item.quantity}`);
        }
      } catch {
        failures.push(`${productId}:${item.quantity}`);
      }
    }

    if (failures.length > 0) {
      console.error(
        `[orders] inventory restoration failed for order ${orderId}: ${failures.join(', ')}`
      );

      throw inventoryRestorationFailedError();
    }

    const releasedOrder =
      await this.dependencies.orderRepository.completeInventoryRelease(order._id);

    if (!releasedOrder) {
      const currentOrder = await this.dependencies.orderRepository.findById(order._id);

      if (
        currentOrder?.status === ORDER_STATUSES.CANCELLED &&
        currentOrder.inventoryStatus === INVENTORY_STATUSES.RELEASED
      ) {
        return toSafeAdminOrderResponse(currentOrder);
      }

      throw inventoryRestorationFailedError();
    }

    return toSafeAdminOrderResponse(releasedOrder);
  }

  private async preValidateProducts(
    normalizedItems: NormalizedOrderItem[]
  ): Promise<ValidatedOrderItem[]> {
    const products = await this.dependencies.productRepository.findActiveByIds(
      normalizedItems.map((item) => item.productId)
    );
    const productsById = new Map<string, ProductDocument>(
      products.map((product) => [product._id.toString(), product])
    );

    return normalizedItems.map((item) => {
      const product = productsById.get(item.productId.toHexString());

      if (!product || product.status !== PRODUCT_STATUSES.ACTIVE) {
        throw productNotAvailableError();
      }

      if (product.stock < item.quantity) {
        throw insufficientStockError();
      }

      getEffectiveUnitPricePaise(product);

      return { item, product };
    });
  }

  private async resolveReservationFailure(
    item: NormalizedOrderItem
  ): Promise<AppError> {
    const currentProducts = await this.dependencies.productRepository.findActiveByIds([
      item.productId,
    ]);
    const currentProduct = currentProducts[0];

    if (!currentProduct || currentProduct.status !== PRODUCT_STATUSES.ACTIVE) {
      return productNotAvailableError();
    }

    return insufficientStockError();
  }

  private buildOrderSummary(reservations: StockReservation[]): OrderSummary {
    const items: OrderItem[] = reservations.map((reservation) => {
      const unitPricePaise = getEffectiveUnitPricePaise(reservation.product);

      return {
        productId: reservation.productId,
        name: reservation.product.name,
        sku: reservation.product.sku,
        quantity: reservation.quantity,
        unitPricePaise,
        lineTotalPaise: multiplyPaiseSafely(unitPricePaise, reservation.quantity),
      };
    });

    const subtotalPaise = sumPaiseSafely(items.map((item) => item.lineTotalPaise));

    return {
      items,
      subtotalPaise,
      totalPaise: subtotalPaise,
    };
  }

  private async compensate(
    reservations: StockReservation[]
  ): Promise<CompensationResult[]> {
    const results: CompensationResult[] = [];

    for (const reservation of [...reservations].reverse()) {
      try {
        await this.dependencies.productRepository.restoreStock(
          reservation.productId,
          reservation.quantity
        );

        results.push({
          productId: toObjectIdString(reservation.productId),
          quantity: reservation.quantity,
          restored: true,
        });
      } catch {
        results.push({
          productId: toObjectIdString(reservation.productId),
          quantity: reservation.quantity,
          restored: false,
        });
      }
    }

    return results;
  }

  private async compensateAndRethrow(
    reservations: StockReservation[],
    originalError: AppError
  ): Promise<never> {
    const results = await this.compensate(reservations);
    const failures = results.filter((result) => !result.restored);

    if (failures.length > 0) {
      const failureDetails = failures
        .map((failure) => `${failure.productId}:${failure.quantity}`)
        .join(', ');

      console.error(
        `[orders] checkout compensation failed for ${failures.length} reservation(s): ${failureDetails}`
      );

      throw new AppError(
        COMPENSATION_FAILED_MESSAGE,
        HttpStatus.INTERNAL_SERVER_ERROR,
        'CHECKOUT_COMPENSATION_FAILED'
      );
    }

    throw originalError;
  }

  private toCheckoutError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    return new AppError(
      CHECKOUT_FAILED_MESSAGE,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_SERVER_ERROR'
    );
  }
}

export const orderService = new OrderService({
  productRepository,
  orderRepository,
});
