import { OrderModel } from './order.model';
import {
  CreateOrderData,
  OrderCustomerId,
  OrderDocument,
  OrderId,
  OrderRepository,
} from './order.types';

export class MongooseOrderRepository implements OrderRepository {
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
}

export const orderRepository: OrderRepository = new MongooseOrderRepository();
