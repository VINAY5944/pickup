
import { Router } from "express";
import express from "express";
import { paymentWebhookController } from "../controllers/paymentController.js";

const router = Router();

router.post(
  "/webhook",
  express.raw({
    type: "application/json",
    limit: "100kb",
  }),
  paymentWebhookController
);

export default router;
