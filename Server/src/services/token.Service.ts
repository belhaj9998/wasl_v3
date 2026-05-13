import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { Response } from "express";
import prisma from "../configs/prisma";
import { config } from "../configs/App.config";
import { AccessTokenPayload, RefreshTokenPayload } from "../types/auth.types";
import { SystemRole } from "../../generated/prisma";
import { AppError } from "../utils/AppError";

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;
const REFRESH_TOKEN_EXPIRY_MS = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

/**
 * Hashes a raw token using SHA-256.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * TokenService handles JWT access token generation/verification,
 * refresh token lifecycle (generate, verify, revoke), and cookie management.
 */
export class TokenService {
  /**
   * Signs a JWT access token with userId and systemRole.
   * Expiry defaults to 15 minutes (configurable via JWT_ACCESS_EXPIRY env).
   */
  generateAccessToken(payload: {
    userId: number;
    systemRole: SystemRole;
  }): string {
    return jwt.sign(
      { userId: payload.userId, systemRole: payload.systemRole },
      config.jwtSecret,
      { expiresIn: config.jwtAccessExpiry as SignOptions["expiresIn"] },
    );
  }

  /**
   * Generates a cryptographically random refresh token, hashes it,
   * stores the hash in the database, and returns the raw token.
   */
  async generateRefreshToken(userId: number): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString("hex");
    const hashedToken = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: hashedToken,
        expires_at: expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Verifies a JWT access token's signature and expiry.
   * Returns the decoded AccessTokenPayload.
   * Throws AppError.unauthorized if invalid or expired.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
      return decoded;
    } catch {
      throw AppError.unauthorized("Unauthorized");
    }
  }

  /**
   * Verifies a raw refresh token by hashing it, looking up in the DB,
   * and checking expiry. Returns RefreshTokenPayload with userId and tokenId.
   * Throws AppError.unauthorized if not found, expired, or invalid.
   */
  async verifyRefreshToken(rawToken: string): Promise<RefreshTokenPayload> {
    const hashedToken = hashToken(rawToken);

    const tokenRecord = await prisma.refreshToken.findFirst({
      where: { token: hashedToken },
    });

    if (!tokenRecord) {
      throw AppError.unauthorized("Unauthorized");
    }

    if (tokenRecord.expires_at < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });
      throw AppError.unauthorized("Unauthorized");
    }

    return {
      userId: tokenRecord.user_id,
      tokenId: tokenRecord.id,
      iat: Math.floor(tokenRecord.created_at.getTime() / 1000),
      exp: Math.floor(tokenRecord.expires_at.getTime() / 1000),
    };
  }

  /**
   * Revokes a specific refresh token for a user by deleting the matching record.
   */
  async revokeRefreshToken(userId: number, rawToken: string): Promise<void> {
    const hashedToken = hashToken(rawToken);

    await prisma.refreshToken.deleteMany({
      where: {
        user_id: userId,
        token: hashedToken,
      },
    });
  }

  /**
   * Revokes all refresh tokens for a user (e.g., on password change or account compromise).
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { user_id: userId },
    });
  }

  /**
   * Sets the refresh token as an httpOnly, secure, sameSite=strict cookie
   * with a 7-day maxAge.
   */
  setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_EXPIRY_MS,
      path: "/",
    });
  }

  /**
   * Clears the refresh token cookie.
   */
  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "strict",
      path: "/",
    });
  }
}

export const tokenService = new TokenService();
