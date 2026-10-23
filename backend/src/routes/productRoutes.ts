
import { Router } from "express";
import { Product } from "../config/model.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      attributes: [
        "id",
        "name",
        "description",
        "pricePaise",
        "stockQuantity",
        "imageUrl",
      ],
      order: [["name", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error("Failed to fetch products:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
});

export default router;
