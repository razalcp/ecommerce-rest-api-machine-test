import { Types } from 'mongoose';
import { RefreshTokenDocument, RefreshTokenModel } from './refresh-token.model';

export type RefreshTokenId = string | Types.ObjectId;

export interface RefreshTokenRepository {
  createSession(
    userId: RefreshTokenId,
    tokenHash: string,
    expiresAt: Date
  ): Promise<RefreshTokenDocument>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  rotateToken(
    oldHash: string,
    newHash: string,
    newExpiry: Date,
    now: Date
  ): Promise<RefreshTokenDocument | null>;
  findByPreviousTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  revokeSessionById(sessionId: RefreshTokenId): Promise<RefreshTokenDocument | null>;
  revokeSessionByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null>;
  revokeAllForUser(userId: RefreshTokenId): Promise<number>;
}

export class MongooseRefreshTokenRepository implements RefreshTokenRepository {
  public async createSession(
    userId: RefreshTokenId,
    tokenHash: string,
    expiresAt: Date
  ): Promise<RefreshTokenDocument> {
    return RefreshTokenModel.create({ userId, tokenHash, expiresAt });
  }

  public async findByTokenHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).exec();
  }

  public async rotateToken(
    oldHash: string,
    newHash: string,
    newExpiry: Date,
    now: Date
  ): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOneAndUpdate(
      {
        tokenHash: oldHash,
        revokedAt: null,
        expiresAt: { $gt: now },
      },
      {
        $set: {
          tokenHash: newHash,
          expiresAt: newExpiry,
          lastUsedAt: now,
        },
        $push: {
          previousTokenHashes: oldHash,
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  public async findByPreviousTokenHash(
    tokenHash: string
  ): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ previousTokenHashes: tokenHash }).exec();
  }

  public async revokeSessionById(
    sessionId: RefreshTokenId
  ): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findByIdAndUpdate(
      sessionId,
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' }
    ).exec();
  }

  public async revokeSessionByTokenHash(
    tokenHash: string
  ): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOneAndUpdate(
      { tokenHash, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { returnDocument: 'after' }
    ).exec();
  }

  public async revokeAllForUser(userId: RefreshTokenId): Promise<number> {
    const result = await RefreshTokenModel.updateMany(
      { userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    ).exec();

    return result.modifiedCount;
  }
}

export const refreshTokenRepository: RefreshTokenRepository =
  new MongooseRefreshTokenRepository();
