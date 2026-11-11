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

export interface UserRepository {
  create(userData: CreateUserInput): Promise<UserDocument>;
  findById(userId: UserId): Promise<UserDocument | null>;
  findByEmail(email: string, includePasswordHash?: boolean): Promise<UserDocument | null>;
  updateActiveStatus(userId: UserId, isActive: boolean): Promise<UserDocument | null>;
  incrementTokenVersion(userId: UserId): Promise<UserDocument | null>;
}
