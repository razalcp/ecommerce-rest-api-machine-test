import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import {
  AccessTokenPayload,
  CreateAccessTokenParams,
  TokenInfo,
} from './auth.types';

export const createAccessToken = ({
  userId,
  role,
  tokenVersion,
}: CreateAccessTokenParams): TokenInfo => {
  const payload: AccessTokenPayload = {
    sub: userId,
    role,
    tokenVersion,
  };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
  });

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: env.JWT_ACCESS_EXPIRES_IN_SECONDS,
  };
};
