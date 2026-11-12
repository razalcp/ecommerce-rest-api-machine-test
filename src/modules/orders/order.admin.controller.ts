import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { parseWithSchema } from '../../shared/utils/validation.util';
import { orderService } from './order.service';
import {
  OrderAdminListQuery,
  ORDER_STATUSES,
  PaginatedSafeAdminOrderResponse,
  SafeAdminOrderResponse,
  UpdateOrderStatusRequest,
} from './order.types';
import {
  adminOrderListQuerySchema,
  orderIdParamSchema,
  updateOrderStatusSchema,
} from './order.validation';

interface AdminOrderResponseData {
  order: SafeAdminOrderResponse;
}

export const listAdminOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  const query: OrderAdminListQuery = parseWithSchema(
    adminOrderListQuerySchema,
    req.query
  );
  const result = await orderService.getAdminOrders(query);

  const response: ApiResponse<PaginatedSafeAdminOrderResponse> = {
    success: true,
    message: 'Orders retrieved successfully',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};

export const getAdminOrder = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(orderIdParamSchema, req.params);
  const order = await orderService.getAdminOrderById(id);

  const response: ApiResponse<AdminOrderResponseData> = {
    success: true,
    message: 'Order retrieved successfully',
    data: { order },
  };

  res.status(HttpStatus.OK).json(response);
};

export const updateAdminOrderStatus = async (
  req: Request<{ id: string }, {}, UpdateOrderStatusRequest>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(orderIdParamSchema, req.params);
  const { status } = parseWithSchema(updateOrderStatusSchema, req.body);
  const order = await orderService.updateOrderStatus(id, status);

  const response: ApiResponse<AdminOrderResponseData> = {
    success: true,
    message:
      order.status === ORDER_STATUSES.CANCELLED
        ? 'Order cancelled successfully'
        : 'Order status updated successfully',
    data: { order },
  };

  res.status(HttpStatus.OK).json(response);
};
