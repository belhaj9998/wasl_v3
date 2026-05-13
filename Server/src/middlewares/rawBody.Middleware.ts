import { Request, Response, NextFunction } from "express";

/**
 * Middleware that preserves the raw request body as a Buffer on the request object.
 * This is required for webhook signature verification — HMAC-SHA256 must be computed
 * on the exact bytes received from the provider, before any JSON parsing.
 *
 * Usage: Apply this middleware BEFORE any JSON body parser on webhook routes.
 * The raw body is stored as `req.rawBody` (Buffer).
 */
export const rawBody = (req: Request, res: Response, next: NextFunction) => {
  const chunks: Buffer[] = [];

  req.on("data", (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });

  req.on("error", (err) => {
    next(err);
  });
};
