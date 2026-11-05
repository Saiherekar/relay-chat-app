import { Request } from "express";

export interface AuthUser {
  userId: number;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export interface ApiError extends Error {
  statusCode?: number;
  details?: unknown[];
}
