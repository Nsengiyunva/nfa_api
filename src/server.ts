import express from "express";
import dotenv from "dotenv";
import farmerRoutes from "./routes/farmerRoutes";
import authRoutes from "./routes/authRoutes";
import { sequelize, connectDB } from "./config/database";

dotenv.config();

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/farmers", farmerRoutes);

console.log("JWT_SECRET:", process.env.JWT_SECRET);


connectDB();
sequelize.sync().then(() => console.log("Tables synced"));

app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
