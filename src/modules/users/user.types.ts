import { HydratedDocument, Types } from 'mongoose';

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  CUSTOMER: 'CUSTOMER',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface User {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<User>;

export type UserId = string | Types.ObjectId;

export interface UserStatus {
  isActive: boolean;
  tokenVersion: number;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateProfileInput {
  fullName: string;
}

export interface UpdateUserStatusInput {
  isActive: boolean;
}

export interface UserListFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export type ListUsersQuery = UserListFilters & PaginationOptions;

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedUsers {
  users: UserProfile[];
  pagination: PaginationMetadata;
}

export interface UserRepository {
  create(userData: CreateUserInput): Promise<UserDocument>;
  findById(userId: UserId): Promise<UserDocument | null>;
  findByEmail(email: string, includePasswordHash?: boolean): Promise<UserDocument | null>;
  updateProfile(
    userId: UserId,
    input: UpdateProfileInput
  ): Promise<UserDocument | null>;
  findUsers(
    filters: UserListFilters,
    pagination: PaginationOptions
  ): Promise<UserDocument[]>;
  countUsers(filters: UserListFilters): Promise<number>;
  updateActiveStatus(userId: UserId, isActive: boolean): Promise<UserDocument | null>;
  incrementTokenVersion(userId: UserId): Promise<UserDocument | null>;
  updateAccountStatusAndIncrementTokenVersion(
    userId: UserId,
    isActive: boolean
  ): Promise<UserDocument | null>;
}
