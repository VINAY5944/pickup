
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DataTypes } from "sequelize";
import sequelize from "./database.js";

const require = createRequire(import.meta.url);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(currentDirectory, "../..");
const modelsDirectory = path.join(backendDirectory, "models");

type ModelFactory = (
  sequelizeInstance: typeof sequelize,
  dataTypes: typeof DataTypes
) => any;

const loadModel = (filename: string): any => {
  const factory = require(path.join(modelsDirectory, filename)) as ModelFactory;
  return factory(sequelize, DataTypes);
};

export const Product = loadModel("product.cjs");
export const Order = loadModel("order.cjs");
export const OrderItem = loadModel("orderitem.cjs");
export const PaymentWebhookEvent = loadModel("paymentwebhookevent.cjs");

Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  as: "items",
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});
