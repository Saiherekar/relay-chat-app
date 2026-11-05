import { Response } from "express";

export function success<T>(
  res: Response,
  data: T,
  message = "Operation completed successfully",
  status = 200,
): void {
  res.status(status).json({ success: true, message, data, errors: null });
}
