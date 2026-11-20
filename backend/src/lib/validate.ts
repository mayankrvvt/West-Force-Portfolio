import type { RequestHandler } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { AppError } from "./errors";
import { toText } from "./text";

export const VALIDATION_ERROR = "VALIDATION_ERROR";

/** Parse data with a zod schema; on failure throw a 400 AppError with the first issue's message. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const first = result.error.issues[0];
    throw new AppError(400, first?.message ?? "Invalid request.", {
      code: VALIDATION_ERROR,
    });
  }

  return result.data;
}

type Schemas = {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
};

/** Validate and replace req.body / req.query / req.params with the parsed values. */
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) {
        req.params = parse(schemas.params, req.params) as typeof req.params;
      }

      if (schemas.query) {
        // Express 5 exposes req.query as a getter, so redefine it.
        Object.defineProperty(req, "query", {
          value: parse(schemas.query, req.query),
          writable: true,
          configurable: true,
          enumerable: true,
        });
      }

      if (schemas.body) {
        req.body = parse(schemas.body, req.body);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/** True for a 24-hex-character Mongo ObjectId string. */
export function isObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value) && mongoose.isValidObjectId(value);
}

/** An `:id` route param as a string; callers answer 404 when it is not an ObjectId. */
export const idParams = z.looseObject({
  id: z.preprocess((value) => toText(value), z.string()),
});

/** Like idParams, but an id that is not an ObjectId is a 400 with this message. */
export const objectIdParams = (message = "Invalid id.") =>
  idParams.refine((params) => isObjectId(params.id), { message, path: ["id"] });
