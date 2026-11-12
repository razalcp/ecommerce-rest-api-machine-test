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

export const INVENTORY_STATUSES = {
  RESERVED: 'RESERVED',
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

export interface OrderRepository {
  create(orderData: CreateOrderData): Promise<OrderDocument>;
  findById(orderId: OrderId): Promise<OrderDocument | null>;
  findByIdAndCustomerId(
    orderId: OrderId,
    customerId: OrderCustomerId
  ): Promise<OrderDocument | null>;
}

export type OrderProductRepository = Pick<
  ProductRepository,
  'findActiveByIds' | 'reserveStock' | 'restoreStock'
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
}
