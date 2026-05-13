import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import prisma from "../../configs/prisma";
import { config } from "../../configs/App.config";
import { AppError } from "../../utils/AppError";
import {
  CustomerRegistrationInput,
  CustomerJwtPayload,
} from "../../types/storefront.types";

/**
 * StorefrontCustomerAuthService handles customer registration and login
 * for the storefront. Uses a separate JWT signing key from admin User JWTs
 * and scopes all operations to a specific store.
 */
export class StorefrontCustomerAuthService {
  /**
   * Registers a new customer within a store.
   * Validates email and phone uniqueness per store, hashes password,
   * creates Customer record with ACTIVE status, and issues a JWT.
   *
   * @param storeId - The store to register the customer in
   * @param input - Registration data (first_name, last_name?, email, phone, password)
   * @returns The created customer (without password_hash) and a signed JWT token
   */
  async register(
    storeId: number,
    input: CustomerRegistrationInput,
  ): Promise<{ customer: Record<string, unknown>; token: string }> {
    // Validate email uniqueness within the store
    const existingEmail = await prisma.customer.findFirst({
      where: {
        store_id: storeId,
        email: input.email.toLowerCase(),
      },
    });

    if (existingEmail) {
      throw AppError.conflict("Email is already in use");
    }

    // Validate phone uniqueness within the store
    const existingPhone = await prisma.customer.findFirst({
      where: {
        store_id: storeId,
        phone: input.phone,
      },
    });

    if (existingPhone) {
      throw AppError.conflict("Phone is already in use");
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    // Create customer record
    const customer = await prisma.customer.create({
      data: {
        store_id: storeId,
        first_name: input.first_name,
        last_name: input.last_name ?? null,
        email: input.email.toLowerCase(),
        phone: input.phone,
        password_hash: passwordHash,
        status: "ACTIVE",
      },
    });

    // Issue JWT with separate signing key
    const token = this.issueToken({
      customerId: customer.id,
      email: customer.email!,
      storeId,
    });

    // Return customer without password_hash
    const { password_hash: _, ...customerData } = customer;

    return { customer: customerData, token };
  }

  /**
   * Authenticates a customer by email and password within a store.
   * Returns a generic 401 error if credentials are invalid (does not reveal
   * whether email or password was incorrect).
   *
   * @param storeId - The store context
   * @param email - Customer email
   * @param password - Plaintext password to verify
   * @returns The customer (without password_hash) and a signed JWT token
   */
  async login(
    storeId: number,
    email: string,
    password: string,
  ): Promise<{ customer: Record<string, unknown>; token: string }> {
    // Find customer by email + store_id
    const customer = await prisma.customer.findFirst({
      where: {
        store_id: storeId,
        email: email.toLowerCase(),
      },
    });

    if (!customer || !customer.password_hash) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(
      password,
      customer.password_hash,
    );

    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Issue JWT
    const token = this.issueToken({
      customerId: customer.id,
      email: customer.email!,
      storeId,
    });

    // Return customer without password_hash
    const { password_hash: _, ...customerData } = customer;

    return { customer: customerData, token };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Issues a customer JWT with a 7-day expiry using the separate
   * customer signing key. Payload includes customerId, email, and storeId.
   */
  private issueToken(payload: CustomerJwtPayload): string {
    return jwt.sign(
      {
        customerId: payload.customerId,
        email: payload.email,
        storeId: payload.storeId,
      },
      config.customerJwtSecret,
      { expiresIn: config.customerJwtExpiry as SignOptions["expiresIn"] },
    );
  }
}

export const storefrontCustomerAuthService =
  new StorefrontCustomerAuthService();
