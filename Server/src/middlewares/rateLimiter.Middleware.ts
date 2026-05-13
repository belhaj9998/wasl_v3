import rateLimit from "express-rate-limit";
import { config } from "../configs/App.config";
import { sendError } from "../utils/apiResponse";

/**
 * Global rate limiter middleware.
 * Limits requests per IP based on configured window and max values.
 * Returns standard RateLimit-* headers and disables legacy X-RateLimit-* headers.
 */
export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many requests, please try again later.",
      429,
    );
  },
});
