import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthRequest, AuthUser } from "../types/api.types";

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      data: null,
      errors: [],
    });
    return;
  }
  try {
    req.user = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET ?? "",
    ) as AuthUser;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      data: null,
      errors: [],
    });
  }
}
