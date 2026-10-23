
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {}

  Product.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      pricePaise: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "pricePaise",
        validate: { min: 1 },
      },
      stockQuantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "stockQuantity",
        validate: { min: 0 },
      },
      imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "imageUrl",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Product",
      tableName: "Products",
      timestamps: true,
    }
  );

  return Product;
};
