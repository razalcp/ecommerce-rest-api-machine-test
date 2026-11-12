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
} from '../products/product.types';
import { orderRepository } from './order.repository';
import {
  CompensationResult,
  CreateOrderData,
  INVENTORY_STATUSES,
  OrderDocument,
  OrderItem,
  OrderItemInput,
  ORDER_CURRENCIES,
  ORDER_STATUSES,
  OrderProductRepository,
  OrderRepository,
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
});

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
