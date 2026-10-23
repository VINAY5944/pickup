
import sequelize from "../config/database.js";
import { Order, OrderItem, Product } from "../config/model.js";

export async function expireOrderIfPending(
  orderId: number
): Promise<boolean> {
  return sequelize.transaction(async (transaction) => {
    // Lock the order so the payment handler and expiry worker
    // can coordinate their state transitions.
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order || order.status !== "PENDING_PAYMENT") {
      return false;
    }

    const expiresAt = new Date(order.expiresAt).getTime();

    // BullMQ can run early due to timing differences.
    // PostgreSQL's order deadline remains authoritative.
    if (!Number.isFinite(expiresAt) || expiresAt > Date.now()) {
      return false;
    }

    const items = await OrderItem.findAll({
      where: { orderId: order.id },
      transaction,
    });

    // Mark expired and restore inventory in the same transaction.
    await order.update(
      { status: "EXPIRED" },
      { transaction }
    );

    for (const item of items) {
      await Product.increment(
        { stockQuantity: item.quantity },
        {
          where: { id: item.productId },
          transaction,
        }
      );
    }

    return true;
  });
}
