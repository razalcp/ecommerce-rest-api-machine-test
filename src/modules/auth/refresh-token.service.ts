import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/app-error';
import { HttpStatus } from '../../shared/errors/http-status';
import { RefreshTokenDocument } from './refresh-token.model';
import { RefreshTokenId, refreshTokenRepository } from './refresh-token.repository';

const REFRESH_TOKEN_BYTES = 32;
const INVALID_REFRESH_TOKEN_MESSAGE = 'Invalid refresh token';
const REFRESH_TOKEN_REUSE_MESSAGE = 'Refresh token reuse detected';

export interface IssuedRefreshToken {
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresIn: number;
}

export interface RotatedRefreshToken {
  refreshToken: string;
  session: RefreshTokenDocument;
  refreshExpiresIn: number;
}

const generateRefreshToken = (): string =>
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');

const hashRefreshToken = (refreshToken: string): string =>
  crypto.createHash('sha256').update(refreshToken).digest('hex');

const calculateExpiry = (now: Date): Date =>
  new Date(now.getTime() + env.REFRESH_TOKEN_EXPIRES_IN_SECONDS * 1000);

export const issueRefreshToken = async (
  userId: RefreshTokenId
): Promise<IssuedRefreshToken> => {
  const refreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(refreshToken);
  const now = new Date();
  const expiresAt = calculateExpiry(now);

  await refreshTokenRepository.createSession(userId, tokenHash, expiresAt);

  return {
    refreshToken,
    expiresAt,
    refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  };
};

export const rotateRefreshToken = async (
  refreshToken: string
): Promise<RotatedRefreshToken> => {
  const oldHash = hashRefreshToken(refreshToken);
  const newRefreshToken = generateRefreshToken();
  const newHash = hashRefreshToken(newRefreshToken);
  const now = new Date();
  const newExpiry = calculateExpiry(now);

  const rotatedSession = await refreshTokenRepository.rotateToken(
    oldHash,
    newHash,
    newExpiry,
    now
  );

  if (rotatedSession) {
    const activeSession = await refreshTokenRepository.findByTokenHash(newHash);

    if (!activeSession || activeSession.revokedAt !== null) {
      throw new AppError(
        INVALID_REFRESH_TOKEN_MESSAGE,
        HttpStatus.UNAUTHORIZED,
        'INVALID_REFRESH_TOKEN'
      );
    }

    return {
      refreshToken: newRefreshToken,
      session: activeSession,
      refreshExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    };
  }

  const reusedSession = await refreshTokenRepository.findByPreviousTokenHash(oldHash);

  if (reusedSession) {
    await refreshTokenRepository.revokeSessionById(reusedSession._id);

    throw new AppError(
      REFRESH_TOKEN_REUSE_MESSAGE,
      HttpStatus.UNAUTHORIZED,
      'REFRESH_TOKEN_REUSE_DETECTED'
    );
  }

  throw new AppError(
    INVALID_REFRESH_TOKEN_MESSAGE,
    HttpStatus.UNAUTHORIZED,
    'INVALID_REFRESH_TOKEN'
  );
};

export const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashRefreshToken(refreshToken);
  const revokedSession = await refreshTokenRepository.revokeSessionByTokenHash(tokenHash);

  if (revokedSession) {
    return;
  }

  const previousSession = await refreshTokenRepository.findByPreviousTokenHash(tokenHash);

  if (previousSession && previousSession.revokedAt === null) {
    await refreshTokenRepository.revokeSessionById(previousSession._id);
  }
};

export const revokeSessionById = async (sessionId: RefreshTokenId): Promise<void> => {
  await refreshTokenRepository.revokeSessionById(sessionId);
};

export const revokeAllForUser = async (userId: RefreshTokenId): Promise<number> => {
  return refreshTokenRepository.revokeAllForUser(userId);
};
