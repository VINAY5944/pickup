
import "dotenv/config";
import { Queue } from "bullmq";

export const ORDER_EXPIRY_QUEUE = "order-expiry";

export const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
};

export const orderExpiryQueue = new Queue(
  ORDER_EXPIRY_QUEUE,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  }
);
