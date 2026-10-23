import { Op } from "sequelize";
import sequelize from "../config/database.js";
import { Product, Order, OrderItem } from "../config/model.js";
import { orderExpiryQueue } from "../queues/orderExpiryQueue.js";
import { expireOrderIfPending } from "./orderExpiryService.js";

type RequestedItem = {
  productId: string;
  quantity: number;
};

function createOrderError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

export async function createOrder(input: unknown) {
  // Validate the request.
  if (!Array.isArray(input) || input.length === 0) {
    throw createOrderError(
      "Order must contain at least one product",
      400
    );
  }

  const items: RequestedItem[] = input;
  const productIds = new Set<string>();

  for (const item of items) {
    if (
      !item ||
      typeof item.productId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        item.productId
      ) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      throw createOrderError(
        "Invalid product ID or quantity",
        400
      );
    }

    const normalizedId = item.productId.toLowerCase();

    if (productIds.has(normalizedId)) {
      throw createOrderError(
        "Duplicate products are not allowed",
        400
      );
    }

    productIds.add(normalizedId);
  }

  // Lock products in consistent order to reduce deadlock risk.
  const sortedItems = [...items].sort((a, b) =>
    a.productId.toLowerCase().localeCompare(
      b.productId.toLowerCase()
    )
  );

  return sequelize.transaction(async (transaction) => {
    let totalAmountPaise = 0;

    const orderItems: {
      productId: string;
      quantity: number;
      unitPricePaise: number;
    }[] = [];

    for (const item of sortedItems) {
      const product = await Product.findOne({
        where: {
          id: item.productId,
          isActive: true,
          stockQuantity: {
            [Op.gte]: item.quantity,
          },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!product) {
        throw createOrderError(
          `Product ${item.productId} is unavailable or has insufficient stock`,
          409
        );
      }

      const itemTotal = product.pricePaise * item.quantity;
      const newTotal = totalAmountPaise + itemTotal;

      if (
        !Number.isSafeInteger(itemTotal) ||
        !Number.isSafeInteger(newTotal) ||
        newTotal > 2147483647
      ) {
        throw createOrderError(
          "Order amount exceeds the allowed limit",
          400
        );
      }

      totalAmountPaise = newTotal;

      await product.decrement("stockQuantity", {
        by: item.quantity,
        transaction,
      });

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        unitPricePaise: product.pricePaise,
      });
    }

    const expiresAt = new Date(Date.now() + 120 * 1000);

    const order = await Order.create(
      {
        status: "PENDING_PAYMENT",
        totalAmountPaise,
        expiresAt,
        pickupCode: null,
      },
      { transaction }
    );

    await OrderItem.bulkCreate(
      orderItems.map((item) => ({
        ...item,
        orderId: order.id,
      })),
      { transaction }
    );

    // Schedule the expiry job.
    await orderExpiryQueue.add(
      "expire-order",
      { orderId: order.id },
      {
        delay: Math.max(
          0,
          new Date(order.expiresAt).getTime() - Date.now()
        ),
        jobId: `expire-order-${order.id}`,
      }
    );

    return {
      orderId: order.id,
      status: order.status,
      totalAmountPaise: order.totalAmountPaise,
      expiresAt: order.expiresAt,
      items: orderItems,
    };
  });
}

export async function getOrderById(orderId: number) {
  // Expire the order first if its payment hold has timed out.
  await expireOrderIfPending(orderId);

  const order = await Order.findByPk(orderId);

  if (!order) {
    return null;
  }

  const now = new Date();
  const expiresAt = new Date(order.expiresAt);

  const expiresInSeconds =
    order.status === "PENDING_PAYMENT"
      ? Math.max(
          0,
          Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)
        )
      : 0;

  const items = await OrderItem.findAll({
    where: { orderId },
    attributes: ["id", "productId", "quantity", "unitPricePaise"],
  });

  return {
    orderId: order.id,
    status: order.status,
    totalAmountPaise: order.totalAmountPaise,
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
    serverTime: now.toISOString(),
    pickupCode: order.status === "PAID" ? order.pickupCode : null,
    items,
  };
}
