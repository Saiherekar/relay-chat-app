import { Response } from "express";
import { AuthRequest } from "../types/api.types";
import { userBl } from "../bl/userBl";
import { chatBl } from "../bl/chatBl";
import { success } from "../utils/responseHandler";


export const userController = {
  register: async (req: AuthRequest, res: Response) =>
    success(
      res,
      await userBl.register(req.body.name, req.body.email, req.body.password),
      "Account created",
      201,
    ),
  login: async (req: AuthRequest, res: Response) =>
    success(
      res,
      await userBl.login(req.body.email, req.body.password),
      "Signed in",
    ),
  chats: async (req: AuthRequest, res: Response) =>
    success(res, await chatBl.listChats(req.user!.userId)),
  profile: async (req: AuthRequest, res: Response) =>
    success(res, await userBl.profile(Number(req.params.userId))),
  updateProfile: async (req: AuthRequest, res: Response) =>
    success(res, await userBl.updateProfile(req.user!.userId, req.body.name)),
};
