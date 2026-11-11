import { revokeAllForUser } from '../auth/refresh-token.service';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { userRepository } from './user.repository';
import {
  ListUsersQuery,
  PaginatedUsers,
  UpdateProfileInput,
  UserDocument,
  UserProfile,
} from './user.types';

const USER_NOT_FOUND_MESSAGE = 'User not found';

const toUserProfile = (user: UserDocument): UserProfile => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const user = await userRepository.findById(userId);

  if (!user) {
    throw new AppError(USER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  return toUserProfile(user);
};

export const updateUserProfile = async (
  userId: string,
  input: UpdateProfileInput
): Promise<UserProfile> => {
  const user = await userRepository.updateProfile(userId, input);

  if (!user) {
    throw new AppError(USER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  return toUserProfile(user);
};

export const listUsers = async (query: ListUsersQuery): Promise<PaginatedUsers> => {
  const { page, limit, ...filters } = query;

  const [users, total] = await Promise.all([
    userRepository.findUsers(filters, { page, limit }),
    userRepository.countUsers(filters),
  ]);

  return {
    users: users.map(toUserProfile),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
};

export const updateUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<UserProfile> => {
  const user = await userRepository.updateAccountStatusAndIncrementTokenVersion(
    userId,
    isActive
  );

  if (!user) {
    throw new AppError(USER_NOT_FOUND_MESSAGE, HttpStatus.NOT_FOUND, 'USER_NOT_FOUND');
  }

  await revokeAllForUser(user._id);

  return toUserProfile(user);
};
