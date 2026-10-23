
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Existing UUID orderId values cannot safely be converted to INTEGER.
      // Stop if either table already contains records.
      const [orderItems] = await queryInterface.sequelize.query(
        'SELECT COUNT(*)::integer AS count FROM "OrderItems"',
        { transaction }
      );

      const [webhookEvents] = await queryInterface.sequelize.query(
        'SELECT COUNT(*)::integer AS count FROM "PaymentWebhookEvents"',
        { transaction }
      );

      if (orderItems[0].count > 0 || webhookEvents[0].count > 0) {
        throw new Error(
          "Cannot change orderId types because existing order items or webhook events were found."
        );
      }

      // Orders.id is INTEGER, so referencing orderId columns must be INTEGER.
      await queryInterface.sequelize.query(
        `ALTER TABLE "OrderItems"
         ALTER COLUMN "orderId" TYPE INTEGER USING NULL::integer`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "PaymentWebhookEvents"
         ALTER COLUMN "orderId" TYPE INTEGER USING NULL::integer`,
        { transaction }
      );

      // Required fields
      await queryInterface.changeColumn(
        "OrderItems",
        "orderId",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "OrderItems",
        "productId",
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "Products", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "OrderItems",
        "quantity",
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction }
      );

      await queryInterface.changeColumn(
        "OrderItems",
        "unitPricePaise",
        { type: Sequelize.INTEGER, allowNull: false },
        { transaction }
      );

      await queryInterface.changeColumn(
        "PaymentWebhookEvents",
        "eventId",
        { type: Sequelize.STRING, allowNull: false },
        { transaction }
      );

      await queryInterface.changeColumn(
        "PaymentWebhookEvents",
        "orderId",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "Orders", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        { transaction }
      );

      // Prevent the same payment event from being processed twice.
      await queryInterface.addIndex(
        "PaymentWebhookEvents",
        ["eventId"],
        {
          unique: true,
          name: "payment_webhook_events_event_id_unique",
          transaction,
        }
      );

      // Prevent invalid quantities and prices.
      await queryInterface.addConstraint("OrderItems", {
        fields: ["quantity"],
        type: "check",
        where: { quantity: { [Sequelize.Op.gt]: 0 } },
        name: "order_items_quantity_positive",
        transaction,
      });

      await queryInterface.addConstraint("OrderItems", {
        fields: ["unitPricePaise"],
        type: "check",
        where: { unitPricePaise: { [Sequelize.Op.gt]: 0 } },
        name: "order_items_price_positive",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    // This migration intentionally has no automatic rollback.
    // Reverting INTEGER order references to UUID would risk data loss.
    throw new Error(
      "This migration cannot be automatically reversed safely."
    );
  },
};
