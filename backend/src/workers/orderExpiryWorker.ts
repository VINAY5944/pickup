
import "dotenv/config";
import { Worker } from "bullmq";
import sequelize from "../config/database.js";
import {
  ORDER_EXPIRY_QUEUE,
  redisConnection,
  orderExpiryQueue,
} from "../queues/orderExpiryQueue.js";
import { expireOrderIfPending } from "../services/orderExpiryService.js";

const worker = new Worker(
  ORDER_EXPIRY_QUEUE,
  async (job) => {
    const orderId = job.data.orderId;

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      throw new Error(`Invalid order ID in job ${job.id}`);
    }

    const expired = await expireOrderIfPending(orderId);

    if (expired) {
      console.log(`Order ${orderId} expired; inventory released.`);
    } else {
      console.log(
        `Order ${orderId} was not expired; no inventory released.`
      );
    }

    return { orderId, expired };
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

worker.on("completed", (job) => {
  console.log(`Expiry job ${job.id} completed`);
});

worker.on("failed", (job, error) => {
  console.error(`Expiry job ${job?.id} failed:`, error.message);
});

worker.on("error", (error) => {
  console.error("BullMQ worker error:", error);
});

async function shutdown(signal: string) {
  console.log(`${signal} received; shutting down expiry worker...`);

  try {
    await worker.close();
    await orderExpiryQueue.close();
    await sequelize.close();
    console.log("Expiry worker shut down cleanly.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
