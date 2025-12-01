import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions  } from "jsonwebtoken";
import { Admin } from "../models/User";
import dotenv from "dotenv";

dotenv.config();

export const checkhealth =  ( req: Request, res: Response ) => {
  res.json({ message: "The Server is Healthy..." });
}


export const generateToken = (id: number): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not defined");

  const payload = { id };

  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRE || "1d") as unknown as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, secret, options);
};

// Register
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const exists = await Admin.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.json({ message: "User registered", user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await Admin.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = generateToken(user.id);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Profile (protected)
export const profile = async (req: Request & { user?: any }, res: Response) => {
  try {
    const user = await Admin.findByPk(req.user.id, {
      attributes: ["id", "name", "email"],
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error });
  }
};
