import Joi from "joi";

export const registerSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().min(2).max(80).required(),
    email: Joi.string().email().max(190).required(),
    password: Joi.string().min(10).max(72).required(),
  }),
  params: Joi.object({}),
  query: Joi.object({}),
});

export const loginSchema = Joi.object({
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
  params: Joi.object({}),
  query: Joi.object({}),
});
