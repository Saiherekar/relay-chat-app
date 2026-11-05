import { RequestHandler } from "express";
import { ObjectSchema } from "joi";

export const validate =
  (schema: ObjectSchema): RequestHandler =>
  (req, res, next) => {
    const { error, value } = schema.validate(
      { body: req.body, params: req.params, query: req.query },
      { abortEarly: false, stripUnknown: true },
    );
    if (error) {
      res
        .status(400)
        .json({
          success: false,
          message: "Validation failed",
          data: null,
          errors: error.details.map((d) => d.message),
        });
      return;
    }
    req.body = value.body;
    req.params = value.params;
    req.query = value.query;
    next();
  };
