import { ErrorRequestHandler } from "express";
import { logger } from "../utils/logger";

interface AppError extends Error {
  statusCode?: number;
  details?: unknown[];
}

export const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  _req,
  res,
  _next,
) => {
  logger.error(err);

  const error: AppError =
    err instanceof Error
      ? (err as AppError)
      : new Error("Internal server error");

  const status = error.statusCode ?? 500;

  res.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error" : error.message,
    data: null,
    errors: error.details ?? [],
  });
};
