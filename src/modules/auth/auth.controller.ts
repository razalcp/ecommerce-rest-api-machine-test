import { Request, Response } from 'express';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { loginUser, logoutUser, refreshTokens, registerUser } from './auth.service';
import {
  AuthResult,
  AuthTokens,
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from './auth.types';

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response
): Promise<void> => {
  const result = await registerUser(req.body);

  const response: ApiResponse<AuthResult> = {
    success: true,
    message: 'Authentication successful',
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
    message: 'Authentication successful',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};

export const refresh = async (
  req: Request<{}, {}, RefreshTokenInput>,
  res: Response
): Promise<void> => {
  const tokens = await refreshTokens(req.body.refreshToken);

  const response: ApiResponse<{ tokens: AuthTokens }> = {
    success: true,
    message: 'Token refreshed successfully',
    data: { tokens },
  };

  res.status(HttpStatus.OK).json(response);
};

export const logout = async (
  req: Request<{}, {}, RefreshTokenInput>,
  res: Response
): Promise<void> => {
  await logoutUser(req.body.refreshToken);

  const response: ApiResponse<Record<string, never>> = {
    success: true,
    message: 'Logged out successfully',
    data: {},
  };

  res.status(HttpStatus.OK).json(response);
};
