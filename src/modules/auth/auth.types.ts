import { UserRole } from '../users/user.types';

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
}

export interface TokenInfo {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthTokens extends TokenInfo {
  refreshToken: string;
  refreshExpiresIn: number;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
  tokenVersion: number;
}

export interface CreateAccessTokenParams {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}
