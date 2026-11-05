import Joi from "joi";

export const createChatSchema = Joi.object({
  body: Joi.object({
    userAId: Joi.number().integer().positive().required(),
    userBId: Joi.number().integer().positive().required(),
  }),
  params: Joi.object({}),
  query: Joi.object({}),
});

export const sendMessageSchema = Joi.object({
  body: Joi.object({
    text: Joi.string().trim().min(1).max(5000).required(),
    clientId: Joi.string().max(100).optional(),
  }),
  params: Joi.object({ chatId: Joi.string().required() }),
  query: Joi.object({}),
});

export const messagesSchema = Joi.object({
  body: Joi.object({}),
  params: Joi.object({ chatId: Joi.string().required() }),
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(30),
    cursor: Joi.string().optional(),
  }),
});

export const readSchema = Joi.object({
  body: Joi.object({}),
  params: Joi.object({
    chatId: Joi.string().required(),
    messageId: Joi.string().required(),
  }),
  query: Joi.object({}),
});

export const lastSeenSchema = Joi.object({
  body: Joi.object({ messageId: Joi.string().required() }),
  params: Joi.object({ chatId: Joi.string().required() }),
  query: Joi.object({}),
});
