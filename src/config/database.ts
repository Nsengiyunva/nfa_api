import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  "farm_db",
  "root",
  "",
  {
    host: "localhost",
    dialect: "mysql"
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("MySQL connected");
  } catch (error) {
    console.error("DB Error:", error);
  }
};
