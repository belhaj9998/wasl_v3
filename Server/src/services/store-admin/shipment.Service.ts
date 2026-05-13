import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { orderStateMachine } from "../../utils/orderStateMachine";
import { ShipmentStatus } from "../../../generated/prisma";

/**
 * Input for creating a shipment.
 */
interface CreateShipmentInput {
  provider: string;
  service_name?: string;
  tracking_number?: string;
  shipping_cost?: number;
  expected_delivery_at?: Date;
}

/**
 * Input for updating shipment fields.
 */
interface UpdateShipmentInput {
  provider?: string;
  service_name?: string;
  tracking_number?: string;
  shipping_cost?: number;
  expected_delivery_at?: Date;
}

/**
 * Input for updating shipment status.
 */
interface UpdateShipmentStatusInput {
  status: ShipmentStatus;
}

/**
 * ShipmentService manages shipments within an order.
 * Handles listing, creation, updates, and status transitions
 * with auto-timestamping for SHIPPED and DELIVERED statuses.
 */
export class ShipmentService {
  /**
   * Lists all shipments for a given order.
   * Throws 404 if the order is not found.
   */
  async listByOrder(storeId: number, orderId: number) {
    // Verify order exists
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const shipments = await prisma.shipment.findMany({
      where: { order_id: orderId, store_id: storeId },
      orderBy: { created_at: "desc" },
    });

    return shipments;
  }

  /**
   * Fetches a single shipment by ID.
   * Throws 404 if not found.
   */
  async getById(storeId: number, shipmentId: number) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, store_id: storeId },
    });

    if (!shipment) {
      throw AppError.notFound("Shipment not found");
    }

    return shipment;
  }

  /**
   * Creates a new shipment for an order.
   * Validates that the order exists (404) and is not in CANCELED or RETURNED status (400).
   * Shipment is created with status PENDING.
   */
  async create(storeId: number, orderId: number, data: CreateShipmentInput) {
    // Validate order exists
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    // Validate order is not in a terminal state
    if (
      order.status === ShipmentStatus.CANCELED ||
      order.status === ShipmentStatus.RETURNED
    ) {
      throw AppError.badRequest(
        `Cannot create shipment for an order with status "${order.status}"`,
      );
    }

    const shipment = await prisma.shipment.create({
      data: {
        store_id: storeId,
        order_id: orderId,
        status: ShipmentStatus.PENDING,
        provider: data.provider,
        service_name: data.service_name ?? null,
        tracking_number: data.tracking_number ?? null,
        shipping_cost: data.shipping_cost ?? 0,
        expected_delivery_at: data.expected_delivery_at ?? null,
      },
    });

    return shipment;
  }

  /**
   * Updates shipment fields (provider, service_name, tracking_number, etc.).
   * Throws 404 if not found.
   */
  async update(storeId: number, shipmentId: number, data: UpdateShipmentInput) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, store_id: storeId },
    });

    if (!shipment) {
      throw AppError.notFound("Shipment not found");
    }

    const updated = await prisma.shipment.update({
      where: { id_store_id: { id: shipmentId, store_id: storeId } },
      data: {
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.service_name !== undefined && {
          service_name: data.service_name,
        }),
        ...(data.tracking_number !== undefined && {
          tracking_number: data.tracking_number,
        }),
        ...(data.shipping_cost !== undefined && {
          shipping_cost: data.shipping_cost,
        }),
        ...(data.expected_delivery_at !== undefined && {
          expected_delivery_at: data.expected_delivery_at,
        }),
      },
    });

    return updated;
  }

  /**
   * Updates shipment status with state machine validation.
   * Auto-sets shipped_at when transitioning to SHIPPED.
   * Auto-sets delivered_at when transitioning to DELIVERED.
   * Throws 404 if not found.
   */
  async updateStatus(
    storeId: number,
    shipmentId: number,
    data: UpdateShipmentStatusInput,
  ) {
    const shipment = await prisma.shipment.findFirst({
      where: { id: shipmentId, store_id: storeId },
    });

    if (!shipment) {
      throw AppError.notFound("Shipment not found");
    }

    // Validate status transition using the same state machine as orders
    orderStateMachine.assertTransition(shipment.status, data.status);

    // Build update data with auto-timestamps
    const updateData: any = { status: data.status };

    if (data.status === ShipmentStatus.SHIPPED) {
      updateData.shipped_at = new Date();
    }

    if (data.status === ShipmentStatus.DELIVERED) {
      updateData.delivered_at = new Date();
    }

    const updated = await prisma.shipment.update({
      where: { id_store_id: { id: shipmentId, store_id: storeId } },
      data: updateData,
    });

    return updated;
  }
}

export const shipmentService = new ShipmentService();
