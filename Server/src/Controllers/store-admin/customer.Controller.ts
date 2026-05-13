import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { customerService } from "../../services/store-admin/customer.Service";
import { AppRequest } from "../../types";

/**
 * CustomerController handles customer management endpoints for store admins.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/stores/:storeId/customers
 * Returns paginated list of customers with search, filtering, and sorting.
 */
export const list = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
  const search = req.query.search as string | undefined;
  const status = req.query.status as
    | "ACTIVE"
    | "BLOCKED"
    | "ARCHIVED"
    | undefined;
  const accepts_marketing =
    req.query.accepts_marketing !== undefined
      ? req.query.accepts_marketing === "true"
      : undefined;
  const sort_by = req.query.sort_by as
    | "created_at"
    | "first_name"
    | "last_name"
    | undefined;
  const sort_order = req.query.sort_order as "asc" | "desc" | undefined;

  const result = await customerService.list(storeId, {
    page,
    limit,
    search,
    status,
    accepts_marketing,
    sort_by,
    sort_order,
  });

  sendPaginated(res, result.data, result.meta, "Customers retrieved");
});

/**
 * POST /api/stores/:storeId/customers
 * Creates a new customer.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;

  const customer = await customerService.create(storeId, req.body);

  sendSuccess(res, { customer }, "Customer created", 201);
});

/**
 * GET /api/stores/:storeId/customers/:customerId
 * Returns a single customer by ID.
 */
export const getById = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const customerId = parseInt(req.params.customerId as string, 10);

  const customer = await customerService.getById(storeId, customerId);

  sendSuccess(res, { customer }, "Customer retrieved");
});

/**
 * PATCH /api/stores/:storeId/customers/:customerId
 * Updates a customer's details.
 */
export const update = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const customerId = parseInt(req.params.customerId as string, 10);

  const customer = await customerService.update(storeId, customerId, req.body);

  sendSuccess(res, { customer }, "Customer updated");
});

/**
 * DELETE /api/stores/:storeId/customers/:customerId
 * Soft deletes a customer (sets status to ARCHIVED).
 */
export const remove = asyncHandler(async (req: AppRequest, res: Response) => {
  const storeId = req.storeId!;
  const customerId = parseInt(req.params.customerId as string, 10);

  await customerService.delete(storeId, customerId);

  sendSuccess(res, null, "Customer deleted");
});

/**
 * GET /api/stores/:storeId/customers/:customerId/orders
 * Returns paginated order history for a customer.
 */
export const getOrderHistory = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const result = await customerService.getOrderHistory(storeId, customerId, {
      page,
      limit,
    });

    sendPaginated(res, result.data, result.meta, "Order history retrieved");
  },
);

/**
 * GET /api/stores/:storeId/customers/:customerId/addresses
 * Returns all addresses for a customer.
 */
export const listAddresses = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);

    const addresses = await customerService.listAddresses(storeId, customerId);

    sendSuccess(res, { addresses }, "Addresses retrieved");
  },
);

/**
 * POST /api/stores/:storeId/customers/:customerId/addresses
 * Creates a new address for a customer.
 */
export const createAddress = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);

    const address = await customerService.createAddress(
      storeId,
      customerId,
      req.body,
    );

    sendSuccess(res, { address }, "Address created", 201);
  },
);

/**
 * PATCH /api/stores/:storeId/customers/:customerId/addresses/:addressId
 * Updates an existing address.
 */
export const updateAddress = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);
    const addressId = parseInt(req.params.addressId as string, 10);

    const address = await customerService.updateAddress(
      storeId,
      customerId,
      addressId,
      req.body,
    );

    sendSuccess(res, { address }, "Address updated");
  },
);

/**
 * DELETE /api/stores/:storeId/customers/:customerId/addresses/:addressId
 * Deletes an address (hard delete).
 */
export const deleteAddress = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);
    const addressId = parseInt(req.params.addressId as string, 10);

    await customerService.deleteAddress(storeId, customerId, addressId);

    sendSuccess(res, null, "Address deleted");
  },
);

/**
 * PATCH /api/stores/:storeId/customers/:customerId/addresses/:addressId/set-default
 * Sets a specific address as the default for a customer.
 */
export const setDefaultAddress = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const customerId = parseInt(req.params.customerId as string, 10);
    const addressId = parseInt(req.params.addressId as string, 10);

    const address = await customerService.setDefaultAddress(
      storeId,
      customerId,
      addressId,
    );

    sendSuccess(res, { address }, "Default address updated");
  },
);
