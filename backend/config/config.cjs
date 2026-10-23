
require("dotenv").config();

const databaseConfig = {
  username: process.env.DB_USER || "pickup",
  password: process.env.DB_PASSWORD || "pickup_dev_password",
  database: process.env.DB_NAME || "pickup_counter",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  dialect: "postgres",
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

module.exports = {
  development: databaseConfig,
  test: {
    ...databaseConfig,
    database: process.env.TEST_DB_NAME || "pickup_counter_test"
  },
  production: databaseConfig
};
