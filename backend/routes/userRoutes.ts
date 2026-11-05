import { Router } from "express";
import { userController } from "../controller/userController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../middleware/validateMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import { registerSchema, loginSchema } from "../validations/userValidation";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(userController.register),
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(userController.login),
);

router.get("/chats", authenticate, asyncHandler(userController.chats));

router.get(
  "/:userId/profile",
  authenticate,
  asyncHandler(userController.profile),
);

router.put(
  "/profile",
  authenticate,
  asyncHandler(userController.updateProfile),
);

export default router;
