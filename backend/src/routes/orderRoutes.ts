
import { Router } from "express";
import { createOrderController, getOrderController } from "../controllers/orderController.js";
import { claimPickupController } from "../controllers/pickupController.js";

const router = Router();

router.post("/", createOrderController);
router.post("/:orderId/pickup-claim", claimPickupController);
router.get("/:orderId", getOrderController);
export default router;
