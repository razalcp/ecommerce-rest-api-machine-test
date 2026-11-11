import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { loginUser, registerUser } from './auth.service';
import { AuthResult, LoginInput, RegisterInput } from './auth.types';

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response
): Promise<void> => {
  const result = await registerUser(req.body);

  const response: ApiResponse<AuthResult> = {
    success: true,
    message: 'User registered successfully',
    data: result,
  };

  res.status(HttpStatus.CREATED).json(response);
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response
): Promise<void> => {
  const result = await loginUser(req.body);

  const response: ApiResponse<AuthResult> = {
    success: true,
    message: 'Login successful',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};
