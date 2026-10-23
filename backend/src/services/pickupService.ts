import sequelize from "../config/database.js";
import { Order } from "../config/model.js";

type PickupError = Error & {
  statusCode: number;
};

function createPickupError(message: string, statusCode: number): PickupError {
  return Object.assign(new Error(message), { statusCode });
}

export async function claimPickup(
  orderId: number,
  pickupCode: string
) {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw createPickupError("Invalid order ID", 400);
  }

  if (!/^\d{6}$/.test(pickupCode)) {
    throw createPickupError("Pickup code must contain 6 digits", 400);
  }

  return sequelize.transaction(async (transaction) => {
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw createPickupError("Order not found", 404);
    }

    if (order.get("status") !== "PAID") {
      throw createPickupError(
        "Order is not available for pickup",
        409
      );
    }

    if (order.get("pickupCode") !== pickupCode) {
      throw createPickupError("Invalid pickup code", 400);
    }

    await order.update(
      { status: "PICKED_UP" },
      { transaction }
    );

    return {
      orderId: order.get("id"),
      status: "PICKED_UP",
    };
  });
}