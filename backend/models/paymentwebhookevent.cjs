
"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PaymentWebhookEvent extends Model {}

  PaymentWebhookEvent.init(
    {
      eventId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "PaymentWebhookEvent",
      tableName: "PaymentWebhookEvents",
      timestamps: true,
    }
  );

  return PaymentWebhookEvent;
};
