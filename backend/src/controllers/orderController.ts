
import type { Request, Response } from "express";
import {
  createOrder,
  getOrderById,
} from "../services/orderServices.js";

export async function createOrderController(
  req: Request,
  res: Response
) {
  try {
    const result = await createOrder(req.body?.items);

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Order creation failed:", error);

    const statusCode =
      error instanceof Error && "statusCode" in error
        ? Number(error.statusCode)
        : 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode !== 500 && error instanceof Error
          ? error.message
          : "Failed to create order",
    });
  }
}

export async function getOrderController(
  req: Request,
  res: Response
) {
  try {
    const orderId = Number(req.params.orderId);

    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order failed:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve order",
    });
  }
}
