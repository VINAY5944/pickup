
import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { processPaymentWebhook } from "../services/paymentService.js";

function isValidSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined
): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret || !signatureHeader) {
    return false;
  }

  // Accept either a plain hexadecimal signature or "sha256=<signature>".
  const receivedSignature = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;

  if (!/^[a-fA-F0-9]{64}$/.test(receivedSignature)) {
    return false;
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest();

  const providedSignature = Buffer.from(receivedSignature, "hex");

  return (
    providedSignature.length === expectedSignature.length &&
    timingSafeEqual(providedSignature, expectedSignature)
  );
}

export async function paymentWebhookController(
  req: Request,
  res: Response
) {
  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Expected a raw JSON request body",
    });
  }

  if (!isValidSignature(req.body, req.header("x-payment-signature"))) {
    return res.status(401).json({
      success: false,
      message: "Invalid payment signature",
    });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }

  try {
    const result = await processPaymentWebhook(payload);

    return res.status(200).json({
      success: true,
      message: "Payment webhook processed",
      data: result,
    });
  } catch (error) {
    console.error("Payment webhook processing failed:", error);

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode >= 400 && statusCode < 500 && error instanceof Error
          ? error.message
          : "Failed to process payment webhook",
    });
  }
}
