import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createStoreSchema,
} from "../../../validators/auth.validators";

describe("Auth Validators", () => {
  describe("registerSchema", () => {
    const validData = {
      name: "Ahmed Ali",
      email: "ahmed@example.com",
      phone: "+966501234567",
      password: "securePass123",
    };

    it("parses valid registration data successfully", () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("accepts phone without leading +", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phone: "966501234567",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimum length name (2 chars)", () => {
      const result = registerSchema.safeParse({ ...validData, name: "Ab" });
      expect(result.success).toBe(true);
    });

    it("accepts minimum length password (8 chars)", () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: "12345678",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email format", () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: "not-an-email",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const emailIssue = result.error.issues.find(
          (i) => i.path[0] === "email",
        );
        expect(emailIssue).toBeDefined();
      }
    });

    it("rejects email without domain", () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: "user@",
      });
      expect(result.success).toBe(false);
    });

    it("rejects phone with letters", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phone: "+966abc1234",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const phoneIssue = result.error.issues.find(
          (i) => i.path[0] === "phone",
        );
        expect(phoneIssue).toBeDefined();
      }
    });

    it("rejects phone shorter than 7 digits", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phone: "+12345",
      });
      expect(result.success).toBe(false);
    });

    it("rejects phone longer than 15 digits", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phone: "+1234567890123456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: "short",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwIssue = result.error.issues.find(
          (i) => i.path[0] === "password",
        );
        expect(pwIssue).toBeDefined();
      }
    });

    it("rejects password longer than 128 characters", () => {
      const result = registerSchema.safeParse({
        ...validData,
        password: "a".repeat(129),
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const pwIssue = result.error.issues.find(
          (i) => i.path[0] === "password",
        );
        expect(pwIssue).toBeDefined();
      }
    });

    it("rejects name shorter than 2 characters", () => {
      const result = registerSchema.safeParse({ ...validData, name: "A" });
      expect(result.success).toBe(false);
    });

    it("rejects name longer than 100 characters", () => {
      const result = registerSchema.safeParse({
        ...validData,
        name: "A".repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing required fields", () => {
      const result = registerSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(4);
      }
    });
  });

  describe("loginSchema", () => {
    it("parses valid login data with email identifier", () => {
      const result = loginSchema.safeParse({
        identifier: "ahmed@example.com",
        password: "securePass123",
      });
      expect(result.success).toBe(true);
    });

    it("parses valid login data with phone identifier", () => {
      const result = loginSchema.safeParse({
        identifier: "+966501234567",
        password: "mypassword",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty identifier", () => {
      const result = loginSchema.safeParse({
        identifier: "",
        password: "securePass123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "identifier",
        );
        expect(issue).toBeDefined();
      }
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        identifier: "ahmed@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "password");
        expect(issue).toBeDefined();
      }
    });

    it("rejects missing identifier field", () => {
      const result = loginSchema.safeParse({ password: "securePass123" });
      expect(result.success).toBe(false);
    });

    it("rejects missing password field", () => {
      const result = loginSchema.safeParse({
        identifier: "ahmed@example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password longer than 128 characters", () => {
      const result = loginSchema.safeParse({
        identifier: "ahmed@example.com",
        password: "a".repeat(129),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("parses valid email", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "user@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email format", () => {
      const result = forgotPasswordSchema.safeParse({
        email: "not-valid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "" });
      expect(result.success).toBe(false);
    });

    it("rejects missing email field", () => {
      const result = forgotPasswordSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("parses valid token and new password", () => {
      const result = resetPasswordSchema.safeParse({
        token: "abc123resettoken",
        new_password: "newSecure123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty token", () => {
      const result = resetPasswordSchema.safeParse({
        token: "",
        new_password: "newSecure123",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "token");
        expect(issue).toBeDefined();
      }
    });

    it("rejects new_password shorter than 8 characters", () => {
      const result = resetPasswordSchema.safeParse({
        token: "validtoken",
        new_password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects new_password longer than 128 characters", () => {
      const result = resetPasswordSchema.safeParse({
        token: "validtoken",
        new_password: "a".repeat(129),
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing token field", () => {
      const result = resetPasswordSchema.safeParse({
        new_password: "newSecure123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("changePasswordSchema", () => {
    it("parses valid current and new passwords", () => {
      const result = changePasswordSchema.safeParse({
        current_password: "oldPassword1",
        new_password: "newPassword1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty current_password", () => {
      const result = changePasswordSchema.safeParse({
        current_password: "",
        new_password: "newPassword1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (i) => i.path[0] === "current_password",
        );
        expect(issue).toBeDefined();
      }
    });

    it("rejects new_password shorter than 8 characters", () => {
      const result = changePasswordSchema.safeParse({
        current_password: "oldPassword1",
        new_password: "short",
      });
      expect(result.success).toBe(false);
    });

    it("rejects new_password longer than 128 characters", () => {
      const result = changePasswordSchema.safeParse({
        current_password: "oldPassword1",
        new_password: "a".repeat(129),
      });
      expect(result.success).toBe(false);
    });

    it("rejects current_password longer than 128 characters", () => {
      const result = changePasswordSchema.safeParse({
        current_password: "a".repeat(129),
        new_password: "newPassword1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing fields", () => {
      const result = changePasswordSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("createStoreSchema", () => {
    it("parses valid store data", () => {
      const result = createStoreSchema.safeParse({
        name: "My Store",
        domain: "my-store",
      });
      expect(result.success).toBe(true);
    });

    it("accepts domain with only lowercase letters", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "mystore",
      });
      expect(result.success).toBe(true);
    });

    it("accepts domain with numbers", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "store123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts domain with hyphens in the middle", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "my-cool-store",
      });
      expect(result.success).toBe(true);
    });

    it("accepts minimum length domain (3 chars)", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "abc",
      });
      expect(result.success).toBe(true);
    });

    it("rejects domain starting with hyphen", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "-mystore",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === "domain");
        expect(issue).toBeDefined();
      }
    });

    it("rejects domain ending with hyphen", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "mystore-",
      });
      expect(result.success).toBe(false);
    });

    it("rejects domain with uppercase letters", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "MyStore",
      });
      expect(result.success).toBe(false);
    });

    it("rejects domain with special characters", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "my_store!",
      });
      expect(result.success).toBe(false);
    });

    it("rejects domain with spaces", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "my store",
      });
      expect(result.success).toBe(false);
    });

    it("rejects domain shorter than 3 characters", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "ab",
      });
      expect(result.success).toBe(false);
    });

    it("rejects domain longer than 63 characters", () => {
      const result = createStoreSchema.safeParse({
        name: "Store",
        domain: "a".repeat(64),
      });
      expect(result.success).toBe(false);
    });

    it("rejects name shorter than 2 characters", () => {
      const result = createStoreSchema.safeParse({
        name: "A",
        domain: "valid-domain",
      });
      expect(result.success).toBe(false);
    });

    it("rejects name longer than 100 characters", () => {
      const result = createStoreSchema.safeParse({
        name: "A".repeat(101),
        domain: "valid-domain",
      });
      expect(result.success).toBe(false);
    });
  });
});
