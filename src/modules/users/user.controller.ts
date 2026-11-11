import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../shared/middleware/auth.middleware';
import { HttpStatus } from '../../shared/errors/http-status';
import { ApiResponse } from '../../shared/types/api-response.type';
import { parseWithSchema } from '../../shared/utils/validation.util';
import {
  getUserProfile,
  listUsers as listUsersService,
  updateUserProfile,
  updateUserStatus as updateUserStatusService,
} from './user.service';
import {
  ListUsersQuery,
  PaginatedUsers,
  UpdateProfileInput,
  UpdateUserStatusInput,
  UserProfile,
} from './user.types';
import { listUsersQuerySchema, userIdParamSchema } from './user.validation';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const user = await getUserProfile(userId);

  const response: ApiResponse<UserProfile> = {
    success: true,
    message: 'Profile retrieved successfully',
    data: user,
  };

  res.status(HttpStatus.OK).json(response);
};

export const updateProfile = async (
  req: Request<{}, {}, UpdateProfileInput>,
  res: Response
): Promise<void> => {
  const { userId } = getAuthenticatedUser(req);
  const user = await updateUserProfile(userId, req.body);

  const response: ApiResponse<UserProfile> = {
    success: true,
    message: 'Profile updated successfully',
    data: user,
  };

  res.status(HttpStatus.OK).json(response);
};

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const query: ListUsersQuery = parseWithSchema(listUsersQuerySchema, req.query);
  const result = await listUsersService(query);

  const response: ApiResponse<PaginatedUsers> = {
    success: true,
    message: 'Users retrieved successfully',
    data: result,
  };

  res.status(HttpStatus.OK).json(response);
};

export const updateUserStatus = async (
  req: Request<{ id: string }, {}, UpdateUserStatusInput>,
  res: Response
): Promise<void> => {
  const { id } = parseWithSchema(userIdParamSchema, req.params);
  const user = await updateUserStatusService(id, req.body.isActive);

  const response: ApiResponse<UserProfile> = {
    success: true,
    message: 'User status updated successfully',
    data: user,
  };

  res.status(HttpStatus.OK).json(response);
};
