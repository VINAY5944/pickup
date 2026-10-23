
import { createHmac, randomUUID } from "node:crypto";

const API_URL = process.env.API_URL ?? "http://localhost:3000";
const SECRET = process.env.PAYMENT_WEBHOOK_SECRET;

async function sendWebhook() {
  const orderId = Number(process.argv[2]);
  const amountPaise = Number(process.argv[3]);
  const status = process.argv[4] ?? "captured";

  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new Error(
      "Usage: npm run send-webhook -- <orderId> <amountPaise> [captured]"
    );
  }

  if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
    throw new Error("amountPaise must be a non-negative integer");
  }

  if (!SECRET) {
    throw new Error("PAYMENT_WEBHOOK_SECRET is missing from your .env file");
  }

  const payload = {
    eventId: `evt_${randomUUID()}`,
    orderId,
    amountPaise,
    status,
  };

  // Sign the exact JSON string that will be sent.
  const rawBody = JSON.stringify(payload);

  const signature = createHmac("sha256", SECRET)
    .update(rawBody)
    .digest("hex");

  const response = await fetch(
    `${API_URL}/api/payments/webhook`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
       "X-Payment-Signature": signature,
      },
      body: rawBody,
    }
  );

  const responseBody = await response.text();

  console.log("HTTP status:", response.status);
  console.log("Webhook payload:", payload);
  console.log("Webhook response:", responseBody);

  if (!response.ok) {
    process.exitCode = 1;
  }
}

sendWebhook().catch((error: unknown) => {
  console.error(
    "Failed to send webhook:",
    error instanceof Error ? error.message : error
  );
  process.exitCode = 1;
});
