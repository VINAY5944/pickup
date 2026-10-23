
"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex(
      "Orders",
      ["status", "expiresAt"],
      {
        name: "orders_status_expires_at_idx",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "Orders",
      "orders_status_expires_at_idx"
    );
  },
};
