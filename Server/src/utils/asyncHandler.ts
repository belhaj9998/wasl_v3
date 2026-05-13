import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<any>;

/**
 * Wraps an async route handler to catch rejected promises
 * and forward them to Express's error handling pipeline via next(error).
 */
export const asyncHandler = (fn: AsyncRouteHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
