import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockDeep, MockProxy } from "vitest-mock-extended";
import { PrismaClient } from "../../../../generated/prisma";

// Mock prisma module
vi.mock("../../../configs/prisma", () => ({
  default: mockDeep<PrismaClient>(),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock token service
vi.mock("../../../services/token.Service", () => ({
  tokenService: {
    generateAccessToken: vi.fn().mockReturnValue("mock-access-token"),
    generateRefreshToken: vi.fn().mockResolvedValue("mock-refresh-token"),
  },
}));

import prisma from "../../../configs/prisma";
import bcrypt from "bcryptjs";
import { AuthService } from "../../../services/auth.Service";
import { tokenService } from "../../../services/token.Service";
import { AppError } from "../../../utils/AppError";

const mockPrisma = prisma as unknown as MockProxy<PrismaClient>;

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
  });

  describe("register", () => {
    const validInput = {
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      password: "securePassword123",
    };

    const mockCreatedUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      password: "hashed-password",
      avatar_url: null,
      system_role: "USER" as const,
      is_active: true,
      last_login_at: null,
      deleted_at: null,
      reset_token: null,
      reset_token_expires_at: null,
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-01-01"),
    };

    it("throws conflict error when email already exists", async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockCreatedUser as any);

      const error = await authService.register(validInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("A user with this email already exists");
    });

    it("throws conflict error when phone already exists", async () => {
      // Email check passes (no existing user)
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      // Phone check fails (existing user)
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockCreatedUser as any);

      const error = await authService.register(validInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe("A user with this phone already exists");
    });

    it("hashes the password with bcrypt before creating user", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser as any);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);

      await authService.register(validInput);

      expect(bcrypt.hash).toHaveBeenCalledWith("securePassword123", 12);
    });

    it("creates user with hashed password and returns user profile with tokens", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockCreatedUser as any);
      vi.mocked(bcrypt.hash).mockResolvedValue("hashed-password" as never);

      const result = await authService.register(validInput);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Test User",
          email: "test@example.com",
          phone: "+1234567890",
          password: "hashed-password",
        },
      });
      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe("test@example.com");
      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      // Password should not be in the returned profile
      expect((result.user as any).password).toBeUndefined();
    });
  });

  describe("login", () => {
    const loginInput = {
      identifier: "test@example.com",
      password: "securePassword123",
    };

    const mockUser = {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
      password: "hashed-password",
      avatar_url: null,
      system_role: "USER" as const,
      is_active: true,
      last_login_at: null,
      deleted_at: null,
      reset_token: null,
      reset_token_expires_at: null,
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-01-01"),
    };

    it("throws unauthorized error when user is not found", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const error = await authService.login(loginInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid credentials");
    });

    it("looks up user by email or phone using OR query", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(authService.login(loginInput)).rejects.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: "test@example.com" }, { phone: "test@example.com" }],
        },
      });
    });

    it("throws forbidden error when account is inactive", async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      mockPrisma.user.findFirst.mockResolvedValue(inactiveUser as any);

      const error = await authService.login(loginInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("Account is deactivated");
    });

    it("throws unauthorized error when password is invalid", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const error = await authService.login(loginInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid credentials");
    });

    it("verifies password using bcrypt.compare", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await authService.login(loginInput);

      expect(bcrypt.compare).toHaveBeenCalledWith(
        "securePassword123",
        "hashed-password",
      );
    });

    it("returns user profile with tokens on successful login", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      const result = await authService.login(loginInput);

      expect(result.user.id).toBe(1);
      expect(result.user.email).toBe("test@example.com");
      expect(result.accessToken).toBe("mock-access-token");
      expect(result.refreshToken).toBe("mock-refresh-token");
      expect((result.user as any).password).toBeUndefined();
    });
  });

  describe("forgotPassword", () => {
    it("returns without error when email does not exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Should not throw — prevents email enumeration
      await expect(
        authService.forgotPassword("nonexistent@example.com"),
      ).resolves.toBeUndefined();
    });

    it("does not attempt to update user when email not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authService.forgotPassword("nonexistent@example.com");

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("stores hashed reset token and expiry when user exists", async () => {
      const mockUser = {
        id: 1,
        email: "test@example.com",
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.user.update.mockResolvedValue(mockUser as any);

      await authService.forgotPassword("test@example.com");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          reset_token: expect.any(String),
          reset_token_expires_at: expect.any(Date),
        }),
      });
    });
  });

  describe("resetPassword", () => {
    const resetInput = {
      token: "raw-reset-token",
      new_password: "newSecurePassword123",
    };

    it("throws bad request error when token is invalid (no matching user)", async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const error = await authService.resetPassword(resetInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Invalid reset token");
    });

    it("throws bad request error when token has expired", async () => {
      const expiredUser = {
        id: 1,
        reset_token: "hashed-token",
        reset_token_expires_at: new Date(Date.now() - 3600000), // 1 hour ago
      };
      mockPrisma.user.findFirst.mockResolvedValue(expiredUser as any);

      const error = await authService.resetPassword(resetInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Reset token has expired");
    });

    it("throws bad request error when reset_token_expires_at is null", async () => {
      const userWithNullExpiry = {
        id: 1,
        reset_token: "hashed-token",
        reset_token_expires_at: null,
      };
      mockPrisma.user.findFirst.mockResolvedValue(userWithNullExpiry as any);

      const error = await authService.resetPassword(resetInput).catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe("Reset token has expired");
    });

    it("updates password and clears reset token on valid token", async () => {
      const validUser = {
        id: 1,
        reset_token: "hashed-token",
        reset_token_expires_at: new Date(Date.now() + 3600000), // 1 hour from now
      };
      mockPrisma.user.findFirst.mockResolvedValue(validUser as any);
      mockPrisma.user.update.mockResolvedValue(validUser as any);
      vi.mocked(bcrypt.hash).mockResolvedValue("new-hashed-password" as never);

      await authService.resetPassword(resetInput);

      expect(bcrypt.hash).toHaveBeenCalledWith("newSecurePassword123", 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          password: "new-hashed-password",
          reset_token: null,
          reset_token_expires_at: null,
        },
      });
    });
  });
});
