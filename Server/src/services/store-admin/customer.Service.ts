import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * Parameters for listing customers with pagination, filtering, and sorting.
 */
interface CustomerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "BLOCKED" | "ARCHIVED";
  sort_by?: "created_at" | "customer_name";
  sort_order?: "asc" | "desc";
}

/**
 * Input for creating a customer.
 */
interface CreateCustomerInput {
  customer_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  birth_date?: Date;
  notes?: string;
  status?: "ACTIVE" | "BLOCKED" | "ARCHIVED";
}

/**
 * Input for updating a customer.
 */
interface UpdateCustomerInput {
  customer_name?: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  birth_date?: Date | null;
  notes?: string | null;
  status?: "ACTIVE" | "BLOCKED" | "ARCHIVED";
}

/**
 * Input for creating a customer address.
 */
interface CreateAddressInput {
  type?: "SHIPPING" | "BILLING" | "OTHER";
  full_name: string;
  phone?: string;
  city: string;
  region?: string;
  street_line_1: string;
  street_line_2?: string;
  postal_code?: string;
  google_maps_url?: string;
  is_default?: boolean;
}

/**
 * Input for updating a customer address.
 */
interface UpdateAddressInput {
  type?: "SHIPPING" | "BILLING" | "OTHER";
  full_name?: string;
  phone?: string | null;
  city?: string;
  region?: string | null;
  street_line_1?: string;
  street_line_2?: string | null;
  postal_code?: string | null;
  google_maps_url?: string | null;
  is_default?: boolean;
}

/**
 * Pagination parameters for order history and other paginated queries.
 */
interface PaginationParams {
  page?: number;
  limit?: number;
}

const customerSelect = {
  id: true,
  store_id: true,
  customer_name: true,
  phone: true,
  gender: true,
  birth_date: true,
  notes: true,
  status: true,
  created_at: true,
  updated_at: true,
} as const;

/**
 * CustomerService handles customer management within a store:
 * listing with filters/search, creating, updating, soft-deleting,
 * order history retrieval, and address book management.
 */
export class CustomerService {
  /**
   * Lists customers with pagination, filtering, sorting, and search.
   */
  async list(storeId: number, params: CustomerListParams) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sort_by = "created_at",
      sort_order = "desc",
    } = params;

    const where: any = { store_id: storeId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy
    const orderBy: any = {};
    if (sort_by === "customer_name") {
      orderBy.customer_name = sort_order;
    } else {
      orderBy.created_at = sort_order;
    }

    const [data, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        select: customerSelect,
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets a customer by ID. Throws 404 if not found.
   */
  async getById(storeId: number, customerId: number) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
      select: customerSelect,
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    return customer;
  }

  /**
   * Creates a new customer.
   * Validates at least email or phone is provided.
   * Checks email/phone uniqueness among active customers in the store.
   */
  async create(storeId: number, data: CreateCustomerInput) {
    const { email, phone } = data;

    // Validate at least email or phone provided
    if (!email && !phone) {
      throw AppError.badRequest("At least one of email or phone is required");
    }

    // Check email uniqueness among active customers
    if (email) {
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          email,
          status: { not: "ARCHIVED" },
        },
      });

      if (existingByEmail) {
        throw AppError.conflict("A customer with this email already exists");
      }
    }

    // Check phone uniqueness among active customers
    if (phone) {
      const existingByPhone = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          phone,
          status: { not: "ARCHIVED" },
        },
      });

      if (existingByPhone) {
        throw AppError.conflict("A customer with this phone already exists");
      }
    }

    const customer = await prisma.customer.create({
      data: {
        store_id: storeId,
        customer_name: data.customer_name ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        birth_date: data.birth_date ?? null,
        notes: data.notes ?? null,
        status: data.status ?? "ACTIVE",
      },
      select: customerSelect,
    });

    return customer;
  }

  /**
   * Updates an existing customer.
   * Validates email/phone uniqueness excluding the current customer.
   * Throws 404 if not found.
   */
  async update(storeId: number, customerId: number, data: UpdateCustomerInput) {
    // Check existence
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    // Check email uniqueness (excluding current customer)
    if (data.email) {
      const existingByEmail = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          email: data.email,
          status: { not: "ARCHIVED" },
          NOT: { id: customerId },
        },
      });

      if (existingByEmail) {
        throw AppError.conflict("A customer with this email already exists");
      }
    }

    // Check phone uniqueness (excluding current customer)
    if (data.phone) {
      const existingByPhone = await prisma.customer.findFirst({
        where: {
          store_id: storeId,
          phone: data.phone,
          status: { not: "ARCHIVED" },
          NOT: { id: customerId },
        },
      });

      if (existingByPhone) {
        throw AppError.conflict("A customer with this phone already exists");
      }
    }

    // Build update data — only include fields that are explicitly provided
    const updateData: any = {};

    if (data.customer_name !== undefined) updateData.customer_name = data.customer_name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.birth_date !== undefined) updateData.birth_date = data.birth_date;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.customer.update({
      where: { id_store_id: { id: customerId, store_id: storeId } },
      data: updateData,
      select: customerSelect,
    });

    return updated;
  }

  /**
   * Soft deletes a customer by setting status to ARCHIVED.
   * Throws 404 if not found.
   */
  async delete(storeId: number, customerId: number) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    await prisma.customer.update({
      where: { id_store_id: { id: customerId, store_id: storeId } },
      data: { status: "ARCHIVED" },
    });
  }

  /**
   * Gets paginated order history for a customer.
   * Throws 404 if customer not found.
   */
  async getOrderHistory(
    storeId: number,
    customerId: number,
    params: PaginationParams,
  ) {
    const { page = 1, limit = 20 } = params;

    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    const where = { store_id: storeId, customer_id: customerId };

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { placed_at: "desc" },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Address Management ────────────────────────────────────────────────────

  /**
   * Lists all addresses for a customer.
   * Throws 404 if customer not found.
   */
  async listAddresses(storeId: number, customerId: number) {
    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    const addresses = await prisma.customerAddress.findMany({
      where: { store_id: storeId, customer_id: customerId },
      orderBy: { created_at: "desc" },
    });

    return addresses;
  }

  /**
   * Creates a new address for a customer.
   * If is_default=true, unsets previous default address.
   * Throws 404 if customer not found.
   */
  async createAddress(
    storeId: number,
    customerId: number,
    data: CreateAddressInput,
  ) {
    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    const { is_default = false, ...addressData } = data;

    // If setting as default, unset previous defaults
    if (is_default) {
      await prisma.customerAddress.updateMany({
        where: { store_id: storeId, customer_id: customerId, is_default: true },
        data: { is_default: false },
      });
    }

    const address = await prisma.customerAddress.create({
      data: {
        store_id: storeId,
        customer_id: customerId,
        type: addressData.type ?? "OTHER",
        full_name: addressData.full_name,
        phone: addressData.phone ?? null,
        city: addressData.city,
        region: addressData.region ?? null,
        street_line_1: addressData.street_line_1,
        street_line_2: addressData.street_line_2 ?? null,
        postal_code: addressData.postal_code ?? null,
        google_maps_url: addressData.google_maps_url ?? null,
        is_default,
      },
    });

    return address;
  }

  /**
   * Updates an existing address.
   * If is_default=true, unsets previous default address.
   * Throws 404 if address not found.
   */
  async updateAddress(
    storeId: number,
    customerId: number,
    addressId: number,
    data: UpdateAddressInput,
  ) {
    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    // Verify address exists
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!address) {
      throw AppError.notFound("Address not found");
    }

    const { is_default, ...addressFields } = data;

    // If setting as default, unset previous defaults
    if (is_default === true) {
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

    // Build update data
    const updateData: any = {};
    if (addressFields.type !== undefined) updateData.type = addressFields.type;
    if (addressFields.full_name !== undefined)
      updateData.full_name = addressFields.full_name;
    if (addressFields.phone !== undefined)
      updateData.phone = addressFields.phone;
    if (addressFields.city !== undefined) updateData.city = addressFields.city;
    if (addressFields.region !== undefined)
      updateData.region = addressFields.region;
    if (addressFields.street_line_1 !== undefined)
      updateData.street_line_1 = addressFields.street_line_1;
    if (addressFields.street_line_2 !== undefined)
      updateData.street_line_2 = addressFields.street_line_2;
    if (addressFields.postal_code !== undefined)
      updateData.postal_code = addressFields.postal_code;
    if (addressFields.google_maps_url !== undefined)
      updateData.google_maps_url = addressFields.google_maps_url;
    if (is_default !== undefined) updateData.is_default = is_default;

    const updated = await prisma.customerAddress.update({
      where: { id_store_id: { id: addressId, store_id: storeId } },
      data: updateData,
    });

    return updated;
  }

  /**
   * Deletes an address (hard delete).
   * Throws 404 if address not found.
   */
  async deleteAddress(storeId: number, customerId: number, addressId: number) {
    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    // Verify address exists
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!address) {
      throw AppError.notFound("Address not found");
    }

    await prisma.customerAddress.delete({
      where: { id_store_id: { id: addressId, store_id: storeId } },
    });
  }

  /**
   * Sets a specific address as the default for a customer.
   * Unsets all other defaults, then sets the specified address.
   * Throws 404 if address not found.
   */
  async setDefaultAddress(
    storeId: number,
    customerId: number,
    addressId: number,
  ) {
    // Verify customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, store_id: storeId },
    });

    if (!customer) {
      throw AppError.notFound("Customer not found");
    }

    // Verify address exists
    const address = await prisma.customerAddress.findFirst({
      where: { id: addressId, store_id: storeId, customer_id: customerId },
    });

    if (!address) {
      throw AppError.notFound("Address not found");
    }

    // Unset all defaults for this customer
    await prisma.customerAddress.updateMany({
      where: { store_id: storeId, customer_id: customerId, is_default: true },
      data: { is_default: false },
    });

    // Set the specified address as default
    const updated = await prisma.customerAddress.update({
      where: { id_store_id: { id: addressId, store_id: storeId } },
      data: { is_default: true },
    });

    return updated;
  }
}

export const customerService = new CustomerService();
