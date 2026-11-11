import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../../config/env';
import { userRepository } from '../../modules/users/user.repository';
import { USER_ROLES } from '../../modules/users/user.types';
import { AppError } from '../errors/app-error';
import { HttpStatus } from '../errors/http-status';
import { AuthenticatedUser } from '../types/auth-user.type';

const AUTHORIZATION_HEADER_PATTERN = /^Bearer\s+(\S+)$/i;

const accessTokenPayloadSchema = z.object({
  sub: z.string().regex(/^[a-f\d]{24}$/i),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.CUSTOMER]),
  tokenVersion: z.number().int().nonnegative(),
});

const extractBearerToken = (authorizationHeader: string | undefined): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const match = AUTHORIZATION_HEADER_PATTERN.exec(authorizationHeader.trim());
  return match ? match[1] : null;
};

const verifyAccessToken = (token: string): z.infer<typeof accessTokenPayloadSchema> => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });

    if (typeof decoded === 'string') {
      throw new AppError(
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN'
      );
    }

    const payload = accessTokenPayloadSchema.safeParse(decoded);

    if (!payload.success) {
      throw new AppError(
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN'
      );
    }

    return payload.data;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(
        'Access token has expired',
        HttpStatus.UNAUTHORIZED,
        'ACCESS_TOKEN_EXPIRED'
      );
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(
        'Invalid access token',
        HttpStatus.UNAUTHORIZED,
        'INVALID_ACCESS_TOKEN'
      );
    }

    throw new AppError(
      'Invalid access token',
      HttpStatus.UNAUTHORIZED,
      'INVALID_ACCESS_TOKEN'
    );
  }
};

export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new AppError(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    const payload = verifyAccessToken(token);
    const user = await userRepository.findById(payload.sub);

    if (!user) {
      throw new AppError(
        'Authentication required',
        HttpStatus.UNAUTHORIZED,
        'AUTHENTICATION_REQUIRED'
      );
    }

    if (!user.isActive) {
      throw new AppError('Account is inactive', HttpStatus.UNAUTHORIZED, 'ACCOUNT_INACTIVE');
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw new AppError(
        'Access token is no longer valid',
        HttpStatus.UNAUTHORIZED,
        'TOKEN_VERSION_MISMATCH'
      );
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const getAuthenticatedUser = (req: Request): AuthenticatedUser => {
  if (!req.user) {
    throw new AppError(
      'Authentication required',
      HttpStatus.UNAUTHORIZED,
      'AUTHENTICATION_REQUIRED'
    );
  }

  return req.user;
};
