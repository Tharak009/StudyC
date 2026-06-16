import crypto from "node:crypto";
import { env } from "../config/env.js";
import { USER_STATUS } from "../constants/user-status.js";
import { ApiError } from "../utils/api-error.js";
import {
  createAccessToken,
  createOpaqueToken,
  createRefreshToken,
  hashToken,
  verifyRefreshToken
} from "../utils/tokens.js";
import {
  refreshTokenRepository,
  type RefreshTokenRepository
} from "../repositories/refresh-token.repository.js";
import {
  userRepository,
  type CreateUserInput,
  type IUserRepository
} from "../repositories/user.repository.js";
import { emailService, type IEmailService } from "./email.service.js";

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly mailer: IEmailService
  ) {}

  async register(input: CreateUserInput, metadata: RequestMetadata) {
    this.assertApprovedEmail(input.email);
    const [existingEmail, existingRollNumber] = await Promise.all([
      this.users.findByEmail(input.email),
      this.users.findByRollNumber(input.rollNumber)
    ]);

    if (existingEmail) throw new ApiError(409, "An account with this email already exists", [], "EMAIL_EXISTS");
    if (existingRollNumber) throw new ApiError(409, "This roll number is already registered", [], "ROLL_NUMBER_EXISTS");

    const user = await this.users.create({
      ...input,
      email: input.email.toLowerCase(),
      rollNumber: input.rollNumber.toUpperCase()
    });
    const tokens = await this.issueTokens(user.id, user.role, metadata);
    return { user: user.toJSON(), ...tokens };
  }

  async login(email: string, password: string, metadata: RequestMetadata) {
    const user = await this.users.findByEmail(email, true);
    if (!user || !(await user.comparePassword(password))) {
      throw new ApiError(401, "Invalid email or password", [], "INVALID_CREDENTIALS");
    }
    if (user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(403, "This account is not active", [], "ACCOUNT_INACTIVE");
    }

    user.lastLogin = new Date();
    await user.save();
    const tokens = await this.issueTokens(user.id, user.role, metadata);
    return { user: user.toJSON(), ...tokens };
  }

  async refresh(rawToken: string, metadata: RequestMetadata): Promise<TokenPair> {
    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new ApiError(401, "Refresh token is invalid or expired", [], "INVALID_REFRESH_TOKEN");
    }

    if (payload.type !== "refresh" || !payload.jti) {
      throw new ApiError(401, "Invalid refresh token", [], "INVALID_REFRESH_TOKEN");
    }

    const stored = await this.refreshTokens.findByTokenId(payload.jti);
    const presentedHash = hashToken(rawToken);
    if (!stored || stored.tokenHash !== presentedHash) {
      await this.refreshTokens.revokeAllForUser(payload.sub);
      throw new ApiError(401, "Refresh token reuse detected", [], "TOKEN_REUSE");
    }
    if (stored.revokedAt || stored.expiresAt <= new Date()) {
      if (stored.revokedAt) await this.refreshTokens.revokeAllForUser(payload.sub);
      throw new ApiError(401, "Refresh token is no longer active", [], "INVALID_REFRESH_TOKEN");
    }

    const user = await this.users.findById(payload.sub);
    if (!user || user.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(401, "User is unavailable", [], "USER_UNAVAILABLE");
    }

    const replacementId = crypto.randomUUID();
    await this.refreshTokens.revoke(payload.jti, replacementId);
    return this.issueTokens(user.id, user.role, metadata, replacementId);
  }

  async logout(rawToken?: string): Promise<void> {
    if (!rawToken) return;
    try {
      const payload = verifyRefreshToken(rawToken);
      await this.refreshTokens.revoke(payload.jti);
    } catch {
      // Logout remains idempotent for expired or malformed credentials.
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findById(userId, true);
    if (!user || !(await user.comparePassword(currentPassword))) {
      throw new ApiError(400, "Current password is incorrect", [], "INVALID_CURRENT_PASSWORD");
    }
    user.password = newPassword;
    await user.save();
    await this.refreshTokens.revokeAllForUser(userId);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user) return;

    const resetToken = createOpaqueToken();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpiresAt = expiresAt;
    await user.save({ validateBeforeSave: false });
    await this.mailer.sendPasswordReset({ recipient: user.email, resetToken, expiresAt });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await userRepository.findOne({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    });
    if (!user) throw new ApiError(400, "Reset token is invalid or expired", [], "INVALID_RESET_TOKEN");

    user.password = newPassword;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    await this.refreshTokens.revokeAllForUser(user.id);
  }

  private assertApprovedEmail(email: string): void {
    const domain = email.toLowerCase().split("@")[1];
    if (!domain || !env.approvedEmailDomains.includes(domain)) {
      throw new ApiError(
        400,
        "Please use an approved college email address",
        [],
        "EMAIL_DOMAIN_NOT_APPROVED"
      );
    }
  }

  private async issueTokens(
    userId: string,
    role: Parameters<typeof createAccessToken>[1],
    metadata: RequestMetadata,
    tokenId = crypto.randomUUID()
  ): Promise<TokenPair> {
    const accessToken = createAccessToken(userId, role);
    const refreshToken = createRefreshToken(userId, tokenId);
    await this.refreshTokens.create({
      tokenId,
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress
    });
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService(userRepository, refreshTokenRepository, emailService);
