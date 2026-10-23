
import express from "express";
import cors from "cors";
import sequelize from "./config/database.js";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app = express();

app.use(cors());

// Keep the webhook route before express.json().
// Payment signature verification needs the original raw request body.
app.use("/api/payments", paymentRoutes);

app.use(express.json());

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);

app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();

    return res.status(200).json({
      success: true,
      message: "API and database are running",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    return res.status(503).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

export default app;
