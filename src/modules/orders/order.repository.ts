import { QueryFilter, Types } from 'mongoose';
import { OrderModel } from './order.model';
import {
  CreateOrderData,
  INVENTORY_STATUSES,
  Order,
  OrderAdminFilters,
  OrderCustomerId,
  OrderDocument,
  OrderId,
  OrderPagination,
  ORDER_STATUSES,
  OrderRepository,
  OrderStatus,
  PaginatedOrderResult,
} from './order.types';

export class MongooseOrderRepository implements OrderRepository {
  private buildAdminFilter(filters: OrderAdminFilters): QueryFilter<Order> {
    const filter: QueryFilter<Order> = {};

    if (filters.status) {
      filter.status = filters.status;
    }

    if (filters.customerId) {
      filter.customerId = new Types.ObjectId(filters.customerId);
    }

    return filter;
  }

  private async findPaginated(
    filter: QueryFilter<Order>,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      OrderModel.countDocuments(filter).exec(),
    ]);

    return {
      orders,
      total,
      page,
      limit,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };
  }

  public async create(orderData: CreateOrderData): Promise<OrderDocument> {
    return OrderModel.create(orderData);
  }

  public async findById(orderId: OrderId): Promise<OrderDocument | null> {
    return OrderModel.findById(orderId).exec();
  }

  public async findByIdAndCustomerId(
    orderId: OrderId,
    customerId: OrderCustomerId
  ): Promise<OrderDocument | null> {
    return OrderModel.findOne({ _id: orderId, customerId }).exec();
  }

  public async findCustomerOrders(
    customerId: OrderCustomerId,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult> {
    return this.findPaginated({ customerId }, pagination);
  }

  public async findAllAdminOrders(
    filters: OrderAdminFilters,
    pagination: OrderPagination
  ): Promise<PaginatedOrderResult> {
    return this.findPaginated(this.buildAdminFilter(filters), pagination);
  }

  public async updateStatusIfCurrent(
    orderId: OrderId,
    expectedStatus: OrderStatus,
    nextStatus: OrderStatus
  ): Promise<OrderDocument | null> {
    return OrderModel.findOneAndUpdate(
      { _id: orderId, status: expectedStatus },
      { $set: { status: nextStatus } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async beginCancellation(
    orderId: OrderId,
    expectedStatus: OrderStatus
  ): Promise<OrderDocument | null> {
    return OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        status: expectedStatus,
        inventoryStatus: INVENTORY_STATUSES.RESERVED,
      },
      {
        $set: {
          status: ORDER_STATUSES.CANCELLED,
          inventoryStatus: INVENTORY_STATUSES.RESTORING,
        },
      },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }

  public async completeInventoryRelease(
    orderId: OrderId
  ): Promise<OrderDocument | null> {
    return OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        status: ORDER_STATUSES.CANCELLED,
        inventoryStatus: INVENTORY_STATUSES.RESTORING,
      },
      { $set: { inventoryStatus: INVENTORY_STATUSES.RELEASED } },
      { returnDocument: 'after', runValidators: true }
    ).exec();
  }
}

export const orderRepository: OrderRepository = new MongooseOrderRepository();
