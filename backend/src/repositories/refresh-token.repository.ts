import { RefreshToken } from "../models/refresh-token.model.js";

export interface CreateRefreshTokenInput {
  tokenId: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

export class RefreshTokenRepository {
  create(input: CreateRefreshTokenInput) {
    return RefreshToken.create({
      tokenId: input.tokenId,
      tokenHash: input.tokenHash,
      user: input.userId,
      expiresAt: input.expiresAt,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress
    });
  }

  findByTokenId(tokenId: string) {
    return RefreshToken.findOne({ tokenId }).exec();
  }

  revoke(tokenId: string, replacedByTokenId?: string) {
    return RefreshToken.findOneAndUpdate(
      { tokenId, revokedAt: { $exists: false } },
      { revokedAt: new Date(), replacedByTokenId },
      { new: true }
    ).exec();
  }

  revokeAllForUser(userId: string) {
    return RefreshToken.updateMany(
      { user: userId, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    ).exec();
  }

  findActiveSessionsByUser(userId: string) {
    return RefreshToken.find(
      {
        user: userId,
        revokedAt: { $exists: false },
        expiresAt: { $gt: new Date() }
      },
      {
        _id: 1,
        tokenId: 1,
        userAgent: 1,
        ipAddress: 1,
        createdAt: 1,
        expiresAt: 1
      }
    )
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  revokeSession(userId: string, tokenId: string) {
    return RefreshToken.findOneAndUpdate(
      { user: userId, tokenId, revokedAt: { $exists: false } },
      { revokedAt: new Date() },
      { new: true }
    ).exec();
  }

  revokeAllExcept(userId: string, currentTokenId: string) {
    return RefreshToken.updateMany(
      { user: userId, tokenId: { $ne: currentTokenId }, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    ).exec();
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
