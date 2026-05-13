import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { storefrontCustomerAuthService } from "../../services/storefront/customerAuth.Service";
import { storefrontCartService } from "../../services/storefront/cart.Service";
import { StorefrontRequest } from "../../types/storefront.types";
import { AppError } from "../../utils/AppError";
import prisma from "../../configs/prisma";
import {
  customerRegisterSchema,
  customerLoginSchema,
  updateProfileSchema,
  addAddressSchema,
  customerOrdersQuerySchema,
} from "../../validators/storefront.validators";

/**
 * StorefrontCustomerController handles customer registration, authentication,
 * profile management, order history, and address management for the storefront.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * POST /api/storefront/:domain/customers/register
 * Registers a new customer, triggers cart merge if session exists,
 * and responds with customer data + JWT token.
 */
export const register = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const sessionId = req.sessionId;

    // Validate request body
    const body = customerRegisterSchema.parse(req.body);

    // Register customer via auth service
    const { customer, token } = await storefrontCustomerAuthService.register(
      storeId,
      body,
    );

    // Trigger cart merge if session exists
    if (sessionId) {
      await storefrontCartService.mergeSessionCartOnLogin(
        storeId,
        customer.id as number,
        sessionId,
      );
    }

    sendSuccess(res, { customer, token }, "Registration successful", 201);
  },
);

/**
 * POST /api/storefront/:domain/customers/login
 * Authenticates a customer, triggers cart merge if session exists,
 * and responds with customer data + JWT token.
 */
export const login = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const sessionId = req.sessionId;

    // Validate request body
    const body = customerLoginSchema.parse(req.body);

    // Login via auth service
    const { customer, token } = await storefrontCustomerAuthService.login(
      storeId,
      body.email,
      body.password,
    );

    // Trigger cart merge if session exists
    if (sessionId) {
      await storefrontCartService.mergeSessionCartOnLogin(
        storeId,
        customer.id as number,
        sessionId,
      );
    }

    sendSuccess(res, { customer, token }, "Login successful");
  },
);

/**
 * GET /api/storefront/:domain/customers/me
 * Returns the authenticated customer's profile (excludes password_hash).
 */
export const getProfile = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        store_id: storeId,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        birth_date: true,
        accepts_marketing: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    sendSuccess(res, { customer }, "Profile retrieved");
  },
);

/**
 * PATCH /api/storefront/:domain/customers/me
 * Updates the authenticated customer's profile fields.
 */
export const updateProfile = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    // Validate request body
    const body = updateProfileSchema.parse(req.body);

    // Check email uniqueness if email is being updated
    if (body.email) {
      const existingEmail = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          email: body.email.toLowerCase(),
          id: { not: customerId },
        },
      });

      if (existingEmail) {
        throw AppError.conflict("Email is already in use");
      }
    }

    // Check phone uniqueness if phone is being updated
    if (body.phone) {
      const existingPhone = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          phone: body.phone,
          id: { not: customerId },
        },
      });

      if (existingPhone) {
        throw AppError.conflict("Phone is already in use");
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (body.first_name !== undefined) updateData.first_name = body.first_name;
    if (body.last_name !== undefined) updateData.last_name = body.last_name;
    if (body.email !== undefined) updateData.email = body.email.toLowerCase();
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.birth_date !== undefined) updateData.birth_date = body.birth_date;
    if (body.accepts_marketing !== undefined)
      updateData.accepts_marketing = body.accepts_marketing;

    const customer = await prisma.customer.update({
      where: { id_store_id: { id: customerId, store_id: storeId } },
      data: updateData,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        birth_date: true,
        accepts_marketing: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    sendSuccess(res, { customer }, "Profile updated");
  },
);

/**
 * GET /api/storefront/:domain/customers/me/orders
 * Returns the authenticated customer's orders, paginated and sorted by placed_at desc.
 */
export const getCustomerOrders = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    // Extract and validate pagination params
    const { page, limit } = customerOrdersQuerySchema.parse(req.query);

    const skip = (page - 1) * limit;

    // Get total count
    const total = await prisma.order.count({
      where: {
        store_id: storeId,
        customer_id: customerId,
      },
    });

    // Get paginated orders
    const orders = await prisma.order.findMany({
      where: {
        store_id: storeId,
        customer_id: customerId,
      },
      orderBy: { placed_at: "desc" },
      skip,
      take: limit,
      include: {
        items: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    sendPaginated(
      res,
      orders,
      { total, page, limit, totalPages },
      "Orders retrieved",
    );
  },
);

/**
 * POST /api/storefront/:domain/customers/me/addresses
 * Adds a new address for the authenticated customer.
 * If is_default is true, unsets the previous default address.
 */
export const addAddress = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    // Validate request body
    const body = addAddressSchema.parse(req.body);

    // If is_default is true, unset previous default address
    if (body.is_default) {
      await prisma.customerAddress.updateMany({
        where: {
          store_id: storeId,
          customer_id: customerId,
          is_default: true,
        },
        data: { is_default: false },
      });
    }

    // Create the address
    const address = await prisma.customerAddress.create({
      data: {
        store_id: storeId,
        customer_id: customerId,
        full_name: body.full_name,
        city: body.city,
        street_line_1: body.street_line_1,
        type: body.type,
        phone: body.phone ?? null,
        region: body.region ?? null,
        street_line_2: body.street_line_2 ?? null,
        postal_code: body.postal_code ?? null,
        google_maps_url: body.google_maps_url ?? null,
        is_default: body.is_default,
      },
    });

    sendSuccess(res, { address }, "Address added", 201);
  },
);
