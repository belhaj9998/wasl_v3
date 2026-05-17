import { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";

/**
 * Creates a middleware that validates req.body against the provided Zod schema.
 * On success, replaces req.body with the parsed (and coerced) output.
 * On failure, passes the ZodError to the next error handler.
 */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }
    req.body = result.data;
    next();
  };
}

/**
 * Creates a middleware that validates req.query against the provided Zod schema.
 * On success, replaces req.query with the parsed (and coerced) output.
 * On failure, passes the ZodError to the next error handler.
 */
export function validateQuery<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(result.error);
    }
    Object.assign(req.params, result.data);
    next();
  };
}

/**
 * Creates a middleware that validates req.params against the provided Zod schema.
 * On success, replaces req.params with the parsed (and coerced) output.
 * On failure, passes the ZodError to the next error handler.
 */
export function validateParams<T extends z.ZodType>(schema: T): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return next(result.error);
    }
    Object.assign(req.query, result.data);
    next();
  };
}
