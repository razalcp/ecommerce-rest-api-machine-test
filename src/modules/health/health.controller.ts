import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/types/api-response.type';

export const getHealth = (_req: Request, res: Response): void => {
  const response: ApiResponse<{ service: string }> = {
    success: true,
    message: 'E-commerce API is running',
    data: {
      service: 'ecommerce-rest-api',
    },
  };

  res.status(200).json(response);
};
