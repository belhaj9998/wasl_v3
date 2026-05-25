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
  updateAddressSchema,
} from "../../validators/storefront.validators";

function toAddressResponse<T extends { region: string | null }>(address: T) {
  return {
    ...address,
    state: address.region,
  };
}

export const register = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const sessionId = req.sessionId;
    const body = customerRegisterSchema.parse(req.body);

    const { customer, token } = await storefrontCustomerAuthService.register(
      storeId,
      body,
    );

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

export const login = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const sessionId = req.sessionId;
    const body = customerLoginSchema.parse(req.body);

    const { customer, token } = await storefrontCustomerAuthService.login(
      storeId,
      body.phone,
      body.password,
    );

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

export const getProfile = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
      select: {
        id: true,
        customer_name: true,
        phone: true,
        gender: true,
        birth_date: true,
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

export const updateProfile = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const body = updateProfileSchema.parse(req.body);

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

    const updateData: Record<string, unknown> = {};
    if (body.customer_name !== undefined)
      updateData.customer_name = body.customer_name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.birth_date !== undefined) updateData.birth_date = body.birth_date;

    const customer = await prisma.customer.update({
      where: { id_store_id: { id: customerId, store_id: storeId } },
      data: updateData,
      select: {
        id: true,
        customer_name: true,
        phone: true,
        gender: true,
        birth_date: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    sendSuccess(res, { customer }, "Profile updated");
  },
);

export const getCustomerOrders = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const { page, limit } = customerOrdersQuerySchema.parse(req.query);
    const skip = (page - 1) * limit;

    const total = await prisma.order.count({
      where: { store_id: storeId, customer_id: customerId },
    });

    const orders = await prisma.order.findMany({
      where: { store_id: storeId, customer_id: customerId },
      orderBy: { placed_at: "desc" },
      skip,
      take: limit,
      include: { items: true },
    });

    sendPaginated(
      res,
      orders,
      { total, page, limit, totalPages: Math.ceil(total / limit) },
      "Orders retrieved",
    );
  },
);

export const getAddresses = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;

    const addresses = await prisma.customerAddress.findMany({
      where: { store_id: storeId, customer_id: customerId },
      orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
    });

    sendSuccess(res, addresses.map(toAddressResponse), "Addresses retrieved");
  },
);

export const addAddress = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const body = addAddressSchema.parse(req.body);

    if (body.is_default) {
      await prisma.customerAddress.updateMany({
        where: { store_id: storeId, customer_id: customerId, is_default: true },
        data: { is_default: false },
      });
    }

    const address = await prisma.customerAddress.create({
      data: {
        store_id: storeId,
        customer_id: customerId,
        full_name: body.full_name,
        city: body.city,
        street_line_1: body.street_line_1,
        type: body.type,
        phone: body.phone ?? null,
        region: body.region ?? body.state ?? null,
        street_line_2: body.street_line_2 ?? null,
        postal_code: body.postal_code ?? null,
        google_maps_url: body.google_maps_url ?? null,
        is_default: body.is_default,
      },
    });

    sendSuccess(
      res,
      { address: toAddressResponse(address) },
      "Address added",
      201,
    );
  },
);

export const updateAddress = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const addressId = parseInt(req.params.addressId as string, 10);

    if (Number.isNaN(addressId) || addressId <= 0) {
      throw AppError.badRequest("Invalid address ID");
    }

    const body = updateAddressSchema.parse(req.body);

    const existingAddress = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!existingAddress) {
      throw AppError.notFound("Address not found");
    }

    if (body.is_default === true) {
      await prisma.customerAddress.updateMany({
        where: {
          store_id: storeId,
          customer_id: customerId,
          is_default: true,
          NOT: { id: addressId },
        },
        data: { is_default: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (body.full_name !== undefined) updateData.full_name = body.full_name;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.street_line_1 !== undefined) {
      updateData.street_line_1 = body.street_line_1;
    }
    if (body.street_line_2 !== undefined) {
      updateData.street_line_2 = body.street_line_2 || null;
    }
    if (body.type !== undefined) updateData.type = body.type;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.region !== undefined || body.state !== undefined) {
      updateData.region = body.region ?? body.state ?? null;
    }
    if (body.postal_code !== undefined) {
      updateData.postal_code = body.postal_code || null;
    }
    if (body.google_maps_url !== undefined) {
      updateData.google_maps_url = body.google_maps_url || null;
    }
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    const address = await prisma.customerAddress.update({
      where: { id_store_id: { id: addressId, store_id: storeId } },
      data: updateData,
    });

    sendSuccess(
      res,
      { address: toAddressResponse(address) },
      "Address updated",
    );
  },
);

export const deleteAddress = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const addressId = parseInt(req.params.addressId as string, 10);

    if (Number.isNaN(addressId) || addressId <= 0) {
      throw AppError.badRequest("Invalid address ID");
    }

    const existingAddress = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!existingAddress) {
      throw AppError.notFound("Address not found");
    }

    await prisma.customerAddress.delete({
      where: { id_store_id: { id: addressId, store_id: storeId } },
    });

    sendSuccess(res, null, "Address deleted");
  },
);

export const setDefaultAddress = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const customerId = req.customer!.customerId;
    const addressId = parseInt(req.params.addressId as string, 10);

    if (Number.isNaN(addressId) || addressId <= 0) {
      throw AppError.badRequest("Invalid address ID");
    }

    const existingAddress = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!existingAddress) {
      throw AppError.notFound("Address not found");
    }

    await prisma.$transaction([
      prisma.customerAddress.updateMany({
        where: { store_id: storeId, customer_id: customerId, is_default: true },
        data: { is_default: false },
      }),
      prisma.customerAddress.update({
        where: { id_store_id: { id: addressId, store_id: storeId } },
        data: { is_default: true },
      }),
    ]);

    sendSuccess(res, null, "Default address updated");
  },
);
