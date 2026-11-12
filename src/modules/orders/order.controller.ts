import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { getAuthenticatedUser } from '../../shared/middleware/auth.middleware';
import { ApiResponse } from '../../shared/types/api-response.type';
import { parseWithSchema } from '../../shared/utils/validation.util';
import { orderService } from './order.service';
import {
  CreateOrderRequest,
  OrderCustomerListQuery,
  PaginatedSafeOrderResponse,
  SafeOrderResponse,
} from './order.types';
import {
  customerOrderListQuerySchema,
  orderIdParamSchema,
} from './order.validation';

interface OrderResponseData {
  order: SafeOrderResponse;
}

export const createOrder = async (
  req: Request<{}, {}, CreateOrderRequest>,
  res: Response
): Promise<void> => {
  const user = getAuthenticatedUser(req);
  const order = await orderService.createOrder(user.userId, req.body.items);

  const response: ApiResponse<OrderResponseData> = {
    success: true,
    message: 'Order created successfully',
    data: { order },
  };

  res.status(HttpStatus.CREATED).json(response);
};

export const listMyOrders = async (req: Request, res: Response): Promise<void> => {
  const user = getAuthenticatedUser(req);
  const query: OrderCustomerListQuery = parseWithSchema(
    customerOrderListQuerySchema,
    req.query
  );
  const result = await orderService.getCustomerOrders(user.userId, query);

  const response: ApiResponse<PaginatedSafeOrderResponse> = {
    success: true,
    message: 'Orders retrieved successfully',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};

export const getMyOrder = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const user = getAuthenticatedUser(req);
  const { id } = parseWithSchema(orderIdParamSchema, req.params);
  const order = await orderService.getCustomerOrderById(user.userId, id);

  const response: ApiResponse<OrderResponseData> = {
    success: true,
    message: 'Order retrieved successfully',
    data: { order },
  };

  res.status(HttpStatus.OK).json(response);
};
