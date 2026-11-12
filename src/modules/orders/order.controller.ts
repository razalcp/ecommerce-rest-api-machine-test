import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { getAuthenticatedUser } from '../../shared/middleware/auth.middleware';
import { ApiResponse } from '../../shared/types/api-response.type';
import { orderService } from './order.service';
import { CreateOrderRequest, SafeOrderResponse } from './order.types';

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
