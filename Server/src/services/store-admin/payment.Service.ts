import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";
import { PrismaTransactionClient } from "../../utils/orderNumberGenerator";
import { PaymentStatus } from "../../../generated/prisma";

/**
 * Input for recording a payment.
 */
interface RecordPaymentInput {
  method: string;
  amount: number;
  currency_code?: string;
  provider?: string;
  transaction_reference?: string;
  payment_link?: string;
  paid_at?: Date;
}

/**
 * Input for processing a refund.
 */
interface ProcessRefundInput {
  amount: number;
  reason?: string;
}

/**
 * PaymentService handles payment recording, refund processing,
 * and automatic payment status recalculation for orders.
 */
export class PaymentService {
  /**
   * Lists all payment transactions for a given order.
   * Throws 404 if the order does not exist in the store.
   */
  async listByOrder(storeId: number, orderId: number) {
    // Verify order exists
    const order = await prisma.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const payments = await prisma.paymentTransaction.findMany({
      where: { order_id: orderId, store_id: storeId },
      orderBy: { created_at: "desc" },
    });

    return payments;
  }

  /**
   * Records a payment against an order.
   * Validates that the amount does not exceed the remaining balance.
   * Recalculates payment status and creates a timeline entry.
   * All operations are performed within a transaction.
   */
  async recordPayment(
    storeId: number,
    orderId: number,
    data: RecordPaymentInput,
    actorUserId: number,
  ) {
    return await prisma.$transaction(async (tx) => {
      // Validate order exists
      const order = await tx.order.findFirst({
        where: { id: orderId, store_id: storeId },
      });

      if (!order) {
        throw AppError.notFound("Order not found");
      }

      // Calculate remaining balance
      const capturedPayments = await tx.paymentTransaction.aggregate({
        where: { order_id: orderId, store_id: storeId, status: "CAPTURED" },
        _sum: { amount: true },
      });

      const refundedPayments = await tx.paymentTransaction.aggregate({
        where: { order_id: orderId, store_id: storeId, status: "REFUNDED" },
        _sum: { amount: true },
      });

      const totalCaptured = Number(capturedPayments._sum.amount ?? 0);
      const totalRefunded = Number(refundedPayments._sum.amount ?? 0);
      const netPaid = totalCaptured - totalRefunded;
      const grandTotal = Number(order.grand_total);
      const remainingBalance = grandTotal - netPaid;

      if (data.amount > remainingBalance) {
        throw AppError.badRequest("Payment amount exceeds remaining balance");
      }

      // Create payment transaction
      const payment = await tx.paymentTransaction.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          method: data.method as any,
          status: "CAPTURED",
          amount: data.amount,
          currency_code: data.currency_code ?? order.currency_code ?? "LYD",
          provider: data.provider ?? null,
          transaction_reference: data.transaction_reference ?? null,
          payment_link: data.payment_link ?? null,
          paid_at: data.paid_at ?? new Date(),
        },
      });

      // Recalculate payment status
      await this.recalculatePaymentStatus(
        storeId,
        orderId,
        tx as unknown as PrismaTransactionClient,
      );

      // Create timeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "PAYMENT_RECORDED",
          note: `Payment of ${data.amount} recorded via ${data.method}`,
          payload: {
            payment_id: payment.id,
            amount: data.amount,
            method: data.method,
          },
        },
      });

      return payment;
    });
  }

  /**
   * Processes a refund for an order.
   * Validates that the refund amount does not exceed the net paid amount.
   * Recalculates payment status and creates a timeline entry.
   * All operations are performed within a transaction.
   */
  async processRefund(
    storeId: number,
    orderId: number,
    data: ProcessRefundInput,
    actorUserId: number,
  ) {
    return await prisma.$transaction(async (tx) => {
      // Validate order exists
      const order = await tx.order.findFirst({
        where: { id: orderId, store_id: storeId },
      });

      if (!order) {
        throw AppError.notFound("Order not found");
      }

      // Calculate net paid amount
      const capturedPayments = await tx.paymentTransaction.aggregate({
        where: { order_id: orderId, store_id: storeId, status: "CAPTURED" },
        _sum: { amount: true },
      });

      const refundedPayments = await tx.paymentTransaction.aggregate({
        where: { order_id: orderId, store_id: storeId, status: "REFUNDED" },
        _sum: { amount: true },
      });

      const totalCaptured = Number(capturedPayments._sum.amount ?? 0);
      const totalRefunded = Number(refundedPayments._sum.amount ?? 0);
      const netPaid = totalCaptured - totalRefunded;

      if (data.amount > netPaid) {
        throw AppError.badRequest("Refund amount exceeds total paid amount");
      }

      // Create refund transaction
      const refund = await tx.paymentTransaction.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          method: "MANUAL" as any,
          status: "REFUNDED",
          amount: data.amount,
          currency_code: order.currency_code ?? "LYD",
          provider: null,
          transaction_reference: null,
          payment_link: null,
          paid_at: new Date(),
        },
      });

      // Recalculate payment status
      await this.recalculatePaymentStatus(
        storeId,
        orderId,
        tx as unknown as PrismaTransactionClient,
      );

      // Create timeline entry
      await tx.orderTimeline.create({
        data: {
          store_id: storeId,
          order_id: orderId,
          actor_user_id: actorUserId,
          event: "REFUND_PROCESSED",
          note: data.reason
            ? `Refund of ${data.amount} processed: ${data.reason}`
            : `Refund of ${data.amount} processed`,
          payload: {
            refund_id: refund.id,
            amount: data.amount,
            reason: data.reason ?? null,
          },
        },
      });

      return refund;
    });
  }

  /**
   * Recalculates the payment status of an order based on all payment transactions.
   * Determines status based on:
   * - UNPAID: net paid is 0 and no refunds exist
   * - PARTIALLY_PAID: net paid > 0 but < grand_total, no refunds
   * - PAID: net paid >= grand_total
   * - REFUNDED: refunds exist and net paid <= 0
   * - PARTIALLY_REFUNDED: refunds exist and net paid > 0 but < grand_total
   */
  async recalculatePaymentStatus(
    storeId: number,
    orderId: number,
    tx?: PrismaTransactionClient,
  ): Promise<PaymentStatus> {
    const client = tx ?? prisma;

    // Get order grand total
    const order = await client.order.findFirst({
      where: { id: orderId, store_id: storeId },
    });

    if (!order) {
      throw AppError.notFound("Order not found");
    }

    const grandTotal = Number(order.grand_total);

    // Sum captured payments
    const capturedResult = await client.paymentTransaction.aggregate({
      where: { order_id: orderId, store_id: storeId, status: "CAPTURED" },
      _sum: { amount: true },
    });

    // Sum refunded payments
    const refundedResult = await client.paymentTransaction.aggregate({
      where: { order_id: orderId, store_id: storeId, status: "REFUNDED" },
      _sum: { amount: true },
    });

    const totalCaptured = Number(capturedResult._sum.amount ?? 0);
    const totalRefunded = Number(refundedResult._sum.amount ?? 0);
    const netPaid = totalCaptured - totalRefunded;
    const hasRefunds = totalRefunded > 0;

    // Determine payment status
    let newStatus: PaymentStatus;

    if (netPaid >= grandTotal && grandTotal > 0) {
      newStatus = "PAID";
    } else if (hasRefunds && netPaid <= 0) {
      newStatus = "REFUNDED";
    } else if (hasRefunds && netPaid > 0 && netPaid < grandTotal) {
      newStatus = "PARTIALLY_REFUNDED";
    } else if (netPaid > 0 && netPaid < grandTotal) {
      newStatus = "PARTIALLY_PAID";
    } else {
      newStatus = "UNPAID";
    }

    // Update order payment status
    await client.order.update({
      where: { id_store_id: { id: orderId, store_id: storeId } },
      data: { payment_status: newStatus },
    });

    return newStatus;
  }
}

export const paymentService = new PaymentService();
