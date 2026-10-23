
"use strict";

const products = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Veg Sandwich",
    description: "Fresh vegetable sandwich",
    pricePaise: 5000,
    stockQuantity: 10,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Cheese Burger",
    description: "Burger with cheese and vegetables",
    pricePaise: 8000,
    stockQuantity: 8,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "French Fries",
    description: "Crispy salted fries",
    pricePaise: 6000,
    stockQuantity: 12,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Cold Coffee",
    description: "Chilled coffee drink",
    pricePaise: 7000,
    stockQuantity: 6,
    imageUrl: null,
    isActive: true,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Chocolate Muffin",
    description: "Chocolate-filled muffin",
    pricePaise: 4500,
    stockQuantity: 10,
    imageUrl: null,
    isActive: true,
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    for (const product of products) {
      const existing = await queryInterface.rawSelect(
        "Products",
        { where: { id: product.id } },
        ["id"]
      );

      if (!existing) {
        await queryInterface.bulkInsert("Products", [
          {
            ...product,
            createdAt: now,
            updatedAt: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("Products", {
      id: products.map((product) => product.id),
    });
  },
};
