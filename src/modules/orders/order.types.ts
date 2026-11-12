import { HydratedDocument, Types } from 'mongoose';
import { ProductDocument, ProductRepository } from '../products/product.types';

export const ORDER_STATUSES = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: [ORDER_STATUSES.CONFIRMED, ORDER_STATUSES.CANCELLED],
  CONFIRMED: [ORDER_STATUSES.PROCESSING, ORDER_STATUSES.CANCELLED],
  PROCESSING: [ORDER_STATUSES.SHIPPED, ORDER_STATUSES.CANCELLED],
  SHIPPED: [ORDER_STATUSES.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

export const CANCELLABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  ORDER_STATUSES.PENDING,
  ORDER_STATUSES.CONFIRMED,
  ORDER_STATUSES.PROCESSING,
];

export const isOrderStatusTransitionAllowed = (
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean => ORDER_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);

export const INVENTORY_STATUSES = {
  RESERVED: 'RESERVED',
  RESTORING: 'RESTORING',
  RELEASED: 'RELEASED',
} as const;

export type InventoryStatus =
  (typeof INVENTORY_STATUSES)[keyof typeof INVENTORY_STATUSES];

export const ORDER_CURRENCIES = {
  INR: 'INR',
} as const;

export type OrderCurrency = (typeof ORDER_CURRENCIES)[keyof typeof ORDER_CURRENCIES];

export interface OrderItem {
  productId: Types.ObjectId;
  name: string;
  sku: string;
  quantity: number;
  unitPricePaise: number;
  lineTotalPaise: number;
}

export interface Order {
  customerId: Types.ObjectId;
  items: OrderItem[];
  subtotalPaise: number;
  totalPaise: number;
  currency: OrderCurrency;
  status: OrderStatus;
  inventoryStatus: InventoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrderDocument = HydratedDocument<Order>;
export type OrderId = string | Types.ObjectId;
export type OrderCustomerId = string | Types.ObjectId;

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  items: OrderItemInput[];
}

export interface CreateOrderData {
  customerId: Types.ObjectId;
  items: OrderItem[];
  subtotalPaise: number;
  totalPaise: number;
  currency: OrderCurrency;
  status: OrderStatus;
  inventoryStatus: InventoryStatus;
}

export interface StockReservation {
  productId: Types.ObjectId;
  quantity: number;
  product: ProductDocument;
}

export interface CompensationResult {
  productId: string;
  quantity: number;
  restored: boolean;
}

export interface OrderPagination {
  page: number;
  limit: number;
}

export interface OrderAdminFilters {
  status?: OrderStatus;
  customerId?: string;
}

export type OrderAdminListQuery = OrderAdminFilters & OrderPagination;
export type OrderCustomerListQuery = OrderPagination;

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface PaginatedOrderResult<TOrder = OrderDocument> {
  orders: TOrder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderRepository {
  create(orderData: CreateOrderData): Promise<OrderDocument>;
  findById(orderId: OrderId): Promise<OrderDocument | null>;
  findByIdAndCustomerId(
    orderId: OrderId,
    customerId: OrderCustomerId
  ): Promise<OrderDocument | null>;
  findCustomerOrders(
    customerId: OrderCustomerId,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult>;
  findAllAdminOrders(
    filters: OrderAdminFilters,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult>;
  updateStatusIfCurrent(
    orderId: OrderId,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus
  ): Promise<OrderDocument | null>;
  beginCancellation(
    orderId: OrderId,
    expectedStatus: OrderStatus
  ): Promise<OrderDocument | null>;
  completeInventoryRelease(orderId: OrderId): Promise<OrderDocument | null>;
}

export type OrderProductRepository = Pick<
  ProductRepository,
  'findActiveByIds' | 'reserveStock' | 'restoreStock' | 'restoreStockOnce'
>;

export interface SafeOrderItemResponse {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SafeOrderResponse {
  id: string;
  items: SafeOrderItemResponse[];
  subtotal: number;
  total: number;
  currency: OrderCurrency;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SafeAdminOrderResponse extends SafeOrderResponse {
  customerId: string;
  inventoryStatus: InventoryStatus;
}

export interface OrderPaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedSafeOrderResponse {
  orders: SafeOrderResponse[];
  pagination: OrderPaginationMetadata;
}

export interface PaginatedSafeAdminOrderResponse {
  orders: SafeAdminOrderResponse[];
  pagination: OrderPaginationMetadata;
}
