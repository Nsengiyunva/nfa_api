import { Router } from "express";
import {
  createFarmer,
  getFarmers,
  getFarmerById,
  updateFarmer,
} from "../controllers/farmerController";

const router = Router();

router.post("/", createFarmer);
router.get("/", getFarmers);
router.get("/:id", getFarmerById);
router.put("/:id", updateFarmer);

export default router;
