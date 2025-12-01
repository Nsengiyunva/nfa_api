import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "erbdb",
  "erbadmin",
  "admin@NSE#256",
  {
    host: "localhost",
    dialect: "mysql"
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database - MySQL connected....");
  } catch (error) {
    console.error("DB Error:", error);
  }
};
