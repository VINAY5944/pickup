import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createHmac } from "node:crypto";
import { Op } from "sequelize";

import app from "../src/app.js";
import sequelize from "../src/config/database.js";
import {
  Product,
  Order,
  OrderItem,
  PaymentWebhookEvent,
} from "../src/config/model.js";
import { orderExpiryQueue } from "../src/queues/orderExpiryQueue.js";

const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error(
    "PAYMENT_WEBHOOK_SECRET must be configured in backend/.env"
  );
}

const createdProductIds: string[] = [];
const createdOrderIds: number[] = [];

function signWebhook(body: string): string {
  return createHmac("sha256", webhookSecret!)
    .update(body)
    .digest("hex");
}

async function createTestProduct(stockQuantity: number) {
  const product = await Product.create({
    name: `Integration Test ${Date.now()} ${Math.random()}`,
    description: "Temporary product created by automated tests",
    pricePaise: 1000,
    stockQuantity,
    imageUrl: null,
    isActive: true,
  });

  const id = product.get("id") as string;
  createdProductIds.push(id);

  return { id, product };
}

async function createTestOrder(productId: string) {
  const response = await request(app)
    .post("/api/orders")
    .send({
      items: [{ productId, quantity: 1 }],
    });

  expect(response.status).toBe(201);

  const orderId = response.body.data.orderId as number;
  createdOrderIds.push(orderId);

  return response.body.data;
}

beforeAll(async () => {
  await sequelize.authenticate();
});

afterAll(async () => {
  try {
    if (createdOrderIds.length > 0) {
      await PaymentWebhookEvent.destroy({
        where: { orderId: { [Op.in]: createdOrderIds } },
      });

      await OrderItem.destroy({
        where: { orderId: { [Op.in]: createdOrderIds } },
      });

      await Order.destroy({
        where: { id: { [Op.in]: createdOrderIds } },
      });
    }

    if (createdProductIds.length > 0) {
      await Product.destroy({
        where: { id: { [Op.in]: createdProductIds } },
      });
    }
  } finally {
    await orderExpiryQueue.close();
    await sequelize.close();
  }
});

describe("Order integration tests", () => {
  it("allows only two of ten customers to buy the last two units", async () => {
    const { id: productId, product } = await createTestProduct(2);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post("/api/orders")
          .send({
            items: [{ productId, quantity: 1 }],
          })
      )
    );

    const successful = responses.filter(
      (response) => response.status === 201
    );
    const rejected = responses.filter(
      (response) => response.status === 409
    );

    for (const response of successful) {
      createdOrderIds.push(response.body.data.orderId);
    }

    expect(successful).toHaveLength(2);
    expect(rejected).toHaveLength(8);

    await product.reload();
    expect(product.get("stockQuantity")).toBe(0);
  });

  it("processes the same signed payment webhook only once", async () => {
    const { id: productId } = await createTestProduct(1);
    const order = await createTestOrder(productId);

    const eventId = `integration-event-${Date.now()}-${Math.random()}`;

    const body = JSON.stringify({
      eventId,
      orderId: order.orderId,
      amountPaise: order.totalAmountPaise,
      status: "captured",
    });

    const signature = signWebhook(body);

    const sendWebhook = () =>
      request(app)
        .post("/api/payments/webhook")
        .set("Content-Type", "application/json")
        .set("X-Payment-Signature", signature)
        .send(body);

    const firstResponse = await sendWebhook();

    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body.data.status).toBe("PAID");

    const secondResponse = await sendWebhook();

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data.duplicate).toBe(true);

    const eventCount = await PaymentWebhookEvent.count({
      where: { eventId },
    });

    expect(eventCount).toBe(1);
  });

  it("allows only one of two simultaneous pickup claims", async () => {
    const { id: productId } = await createTestProduct(1);
    const order = await createTestOrder(productId);

    const pickupCode = "123456";

    await Order.update(
      {
        status: "PAID",
        pickupCode,
      },
      {
        where: { id: order.orderId },
      }
    );

    const claimPickup = () =>
      request(app)
        .post(`/api/orders/${order.orderId}/pickup-claim`)
        .send({ pickupCode });

    const responses = await Promise.all([
      claimPickup(),
      claimPickup(),
    ]);

    expect(
      responses.filter((response) => response.status === 200)
    ).toHaveLength(1);

    expect(
      responses.filter((response) => response.status === 409)
    ).toHaveLength(1);

    const savedOrder = await Order.findByPk(order.orderId);
    expect(savedOrder?.get("status")).toBe("PICKED_UP");
  });
});