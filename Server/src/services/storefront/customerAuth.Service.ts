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
   * Validates phone uniqueness per store, hashes password,
   * creates Customer record with ACTIVE status, and issues a JWT.
   */
  async register(
    storeId: number,
    input: CustomerRegistrationInput,
  ): Promise<{ customer: Record<string, unknown>; token: string }> {
    const existingPhone = await prisma.customer.findFirst({
      where: {
        store_id: storeId,
        phone: input.phone,
      },
    });

    if (existingPhone) {
      throw AppError.conflict("Phone is already in use");
    }

    const passwordHash = await bcrypt.hash(input.password, config.bcryptRounds);

    const customer = await prisma.customer.create({
      data: {
        store_id: storeId,
        customer_name: input.customer_name,
        phone: input.phone,
        password_hash: passwordHash,
        status: "ACTIVE",
      },
    });

    const token = this.issueToken({
      customerId: customer.id,
      phone: customer.phone!,
      storeId,
    });

    const { password_hash: _, ...customerData } = customer;

    return { customer: customerData, token };
  }

  /**
   * Authenticates a customer by phone and password within a store.
   */
  async login(
    storeId: number,
    phone: string,
    password: string,
  ): Promise<{ customer: Record<string, unknown>; token: string }> {
    const customer = await prisma.customer.findFirst({
      where: {
        store_id: storeId,
        phone,
      },
    });

    if (!customer || !customer.password_hash) {
      throw AppError.unauthorized("Invalid phone or password");
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      customer.password_hash,
    );

    if (!isPasswordValid) {
      throw AppError.unauthorized("Invalid phone or password");
    }

    const token = this.issueToken({
      customerId: customer.id,
      phone: customer.phone!,
      storeId,
    });

    const { password_hash: _, ...customerData } = customer;

    return { customer: customerData, token };
  }

  private issueToken(payload: CustomerJwtPayload): string {
    return jwt.sign(
      {
        customerId: payload.customerId,
        phone: payload.phone,
        storeId: payload.storeId,
      },
      config.customerJwtSecret,
      { expiresIn: config.customerJwtExpiry as SignOptions["expiresIn"] },
    );
  }
}

export const storefrontCustomerAuthService =
  new StorefrontCustomerAuthService();
