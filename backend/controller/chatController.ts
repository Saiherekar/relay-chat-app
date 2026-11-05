import { Response } from "express";
import { AuthRequest } from "../types/api.types";
import { chatBl } from "../bl/chatBl";
import { success } from "../utils/responseHandler";
import { emitToChat } from "../config/socket.config";

// Safely extract route parameters as strings
const getRouteParam = (value: string | string[] | undefined): string => {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new Error("Missing route parameter");
  }

  return param;
};

export const chatController = {
  create: async (req: AuthRequest, res: Response) => {
    return success(
      res,
      await chatBl.createChat(
        req.user!.userId,
        Number(req.body.userAId),
        Number(req.body.userBId),
      ),
      "Chat retrieved successfully",
      201,
    );
  },

  send: async (req: AuthRequest, res: Response) => {
    const chatId = getRouteParam(req.params.chatId);

    const message = await chatBl.sendMessage(
      req.user!.userId,
      chatId,
      req.body.text,
      req.body.clientId,
    );

    emitToChat(chatId, "receive_message", message);

    return success(res, message, "Message sent", 201);
  },

  messages: async (req: AuthRequest, res: Response) => {
    const chatId = getRouteParam(req.params.chatId);

    return success(
      res,
      await chatBl.getMessages(
        req.user!.userId,
        chatId,
        Number(req.query.limit),
        req.query.cursor as string | undefined,
      ),
    );
  },

  read: async (req: AuthRequest, res: Response) => {
    const chatId = getRouteParam(req.params.chatId);
    const messageId = getRouteParam(req.params.messageId);

    const receipt = await chatBl.markRead(req.user!.userId, chatId, messageId);

    emitToChat(chatId, "message_read", receipt);

    return success(res, receipt, "Message marked as read");
  },

  lastSeen: async (req: AuthRequest, res: Response) => {
    const chatId = getRouteParam(req.params.chatId);

    const data = await chatBl.updateLastSeen(
      req.user!.userId,
      chatId,
      req.body.messageId,
    );

    emitToChat(chatId, "last_seen_updated", data);

    return success(res, data, "Last seen updated");
  },
};
