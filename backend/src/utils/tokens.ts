import crypto from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "../constants/roles.js";

export interface AccessTokenPayload extends JwtPayload {
  sub: string;
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export const createAccessToken = (userId: string, role: Role): string =>
  jwt.sign(
    { sub: userId, role, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL } as SignOptions
  );

export const createRefreshToken = (userId: string, tokenId: string): string =>
  jwt.sign(
    { sub: userId, jti: tokenId, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` } as SignOptions
  );

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createOpaqueToken = (): string => crypto.randomBytes(32).toString("hex");
