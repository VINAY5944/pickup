
import { randomInt } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import sequelize from "../config/database.js";
import {
  Order,
  OrderItem,
  Product,
  PaymentWebhookEvent,
} from "../config/model.js";

type PaymentPayload = {
  eventId: string;
  orderId: number;
  amountPaise: number;
  status: "captured" | "failed";
};

class PaymentServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "PaymentServiceError";
    this.statusCode = statusCode;
  }
}

function validatePayload(payload: unknown): PaymentPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new PaymentServiceError("Invalid payment payload", 400);
  }

  const data = payload as Record<string, unknown>;

  if (
    typeof data.eventId !== "string" ||
    data.eventId.trim().length === 0 ||
    data.eventId.length > 255 ||
    !Number.isSafeInteger(data.orderId) ||
    Number(data.orderId) <= 0 ||
    !Number.isSafeInteger(data.amountPaise) ||
    Number(data.amountPaise) < 0 ||
    (data.status !== "captured" && data.status !== "failed")
  ) {
    throw new PaymentServiceError(
      "Invalid eventId, orderId, amountPaise, or status",
      400
    );
  }

  return {
    eventId: data.eventId,
    orderId: Number(data.orderId),
    amountPaise: Number(data.amountPaise),
    status: data.status,
  };
}

async function restoreReservedStock(
  orderId: number,
  transaction: any
) {
  const items = await OrderItem.findAll({
    where: { orderId },
    transaction,
  });

  for (const item of items) {
    const product = await Product.findByPk(item.productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product) {
      throw new Error(
        `Product ${item.productId} for order ${orderId} was not found`
      );
    }

    await product.increment("stockQuantity", {
      by: Number(item.quantity),
      transaction,
    });
  }
}

export async function processPaymentWebhook(payload: unknown) {
  const data = validatePayload(payload);

  try {
    return await sequelize.transaction(async (transaction) => {
      // Lock the order so payment processing cannot race with expiry.
      const order = await Order.findByPk(data.orderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!order) {
        throw new PaymentServiceError("Order not found", 404);
      }

      // The unique eventId constraint prevents processing the same
      // webhook event more than once.
      const paymentEvent = await PaymentWebhookEvent.create(
        {
          eventId: data.eventId,
          orderId: data.orderId,
          status: "PROCESSING",
        },
        { transaction }
      );

      const orderStatus = String(order.status);

      const isLate =
        orderStatus === "EXPIRED" ||
        (orderStatus === "PENDING_PAYMENT" &&
          new Date(order.expiresAt).getTime() <= Date.now());

      // Never downgrade an already paid or collected order.
      if (orderStatus === "PAID" || orderStatus === "PICKED_UP") {
        await paymentEvent.update(
          { status: "IGNORED_ALREADY_PAID" },
          { transaction }
        );

        return {
          orderId: data.orderId,
          status: orderStatus,
          duplicate: false,
        };
      }

      // Late successful payments require manual review.
      // If the order is still pending but its deadline has passed,
      // release its reservation before moving it to review.
      if (data.status === "captured" && isLate) {
        if (orderStatus === "PENDING_PAYMENT") {
          await restoreReservedStock(data.orderId, transaction);
        }

        await order.update(
          { status: "NEEDS_REVIEW" },
          { transaction }
        );

        await paymentEvent.update(
          { status: "NEEDS_REVIEW_LATE_PAYMENT" },
          { transaction }
        );

        return {
          orderId: data.orderId,
          status: "NEEDS_REVIEW",
          reason: "Payment arrived after the reservation expired",
        };
      }

      // Failed payments release reserved inventory only if the
      // order still has an active reservation.
      if (data.status === "failed") {
        if (orderStatus === "PENDING_PAYMENT") {
          await restoreReservedStock(data.orderId, transaction);

          await order.update(
            { status: "PAYMENT_FAILED" },
            { transaction }
          );
        }

        await paymentEvent.update(
          { status: "PROCESSED_FAILED" },
          { transaction }
        );

        return {
          orderId: data.orderId,
          status:
            orderStatus === "PENDING_PAYMENT"
              ? "PAYMENT_FAILED"
              : orderStatus,
        };
      }

      // A captured payment with the wrong amount must not mark
      // the order paid.
      if (data.amountPaise !== Number(order.totalAmountPaise)) {
        if (orderStatus === "PENDING_PAYMENT") {
          await restoreReservedStock(data.orderId, transaction);
        }

        await order.update(
          { status: "NEEDS_REVIEW" },
          { transaction }
        );

        await paymentEvent.update(
          { status: "NEEDS_REVIEW_AMOUNT_MISMATCH" },
          { transaction }
        );

        return {
          orderId: data.orderId,
          status: "NEEDS_REVIEW",
          reason: "Payment amount does not match the order total",
        };
      }

      // A captured payment is accepted only for a pending order
      // with an active reservation.
      if (orderStatus !== "PENDING_PAYMENT") {
        await paymentEvent.update(
          { status: "NEEDS_REVIEW_INVALID_ORDER_STATE" },
          { transaction }
        );

        await order.update(
          { status: "NEEDS_REVIEW" },
          { transaction }
        );

        return {
          orderId: data.orderId,
          status: "NEEDS_REVIEW",
          reason: "Order is not awaiting payment",
        };
      }

      const pickupCode = String(randomInt(100000, 1000000));

      await order.update(
        {
          status: "PAID",
          pickupCode,
        },
        { transaction }
      );

      await paymentEvent.update(
        { status: "PROCESSED_SUCCESS" },
        { transaction }
      );

      return {
        orderId: data.orderId,
        status: "PAID",
        pickupCode,
      };
    });
  } catch (error) {
    // Concurrent duplicate deliveries may conflict on the unique
    // eventId constraint. The first committed transaction wins.
    if (error instanceof UniqueConstraintError) {
      return {
        duplicate: true,
        message: "Payment event has already been processed",
      };
    }

    throw error;
  }
}
