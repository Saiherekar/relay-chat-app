import { Router } from "express";
import { chatController } from "../controller/chatController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../middleware/validateMiddleware";
import { asyncHandler } from "../utils/asyncHandler";
import {
  createChatSchema,
  sendMessageSchema,
  messagesSchema,
  readSchema,
  lastSeenSchema,
} from "../validations/chatValidation";

const router = Router();

router.use(authenticate);

router.post(
  "/create",
  validate(createChatSchema),
  asyncHandler(chatController.create),
);

router.post(
  "/:chatId/message/send",
  validate(sendMessageSchema),
  asyncHandler(chatController.send),
);

router.get(
  "/:chatId/messages",
  validate(messagesSchema),
  asyncHandler(chatController.messages),
);

router.post(
  "/:chatId/message/:messageId/read",
  validate(readSchema),
  asyncHandler(chatController.read),
);

router.post(
  "/:chatId/lastseen",
  validate(lastSeenSchema),
  asyncHandler(chatController.lastSeen),
);

export default router;
