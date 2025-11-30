import { Request, Response } from "express";
import { Farmer } from "../models/Farmer";

// Create
export const createFarmer = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.create(req.body);
    res.status(201).json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// Get all
export const getFarmers = async (_req: Request, res: Response) => {
  try {
    const farmers = await Farmer.findAll();
    res.json({ success: true, farmers });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// Get one
export const getFarmerById = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id);
    if (!farmer)
      return res.status(404).json({ success: false, message: "Farmer not found" });

    res.json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};

// Update
export const updateFarmer = async (req: Request, res: Response) => {
  try {
    const farmer = await Farmer.findByPk(req.params.id);
    if (!farmer)
      return res.status(404).json({ success: false, message: "Farmer not found" });

    await farmer.update(req.body);

    res.json({ success: true, farmer });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
};
