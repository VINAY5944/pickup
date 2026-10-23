
import type { Request, Response } from "express";
import { claimPickup } from "../services/pickupService.js";

export async function claimPickupController(
  req: Request,
  res: Response
) {
  try {
    const orderId = Number(req.params.orderId);
    const pickupCode = req.body?.pickupCode;

    if (typeof pickupCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Pickup code is required",
      });
    }

    const result = await claimPickup(orderId, pickupCode);

    return res.status(200).json({
      success: true,
      message: "Pickup claimed successfully",
      data: result,
    });
  } catch (error) {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode !== 500 && error instanceof Error
          ? error.message
          : "Failed to claim pickup",
    });
  }
}
