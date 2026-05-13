import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse";

/**
 * Auth-specific rate limiter middleware.
 * Stricter limits (5 requests per 15-minute window) on login/forgot-password
 * endpoints to prevent brute-force attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many attempts, please try again later.",
      429,
    );
  },
});
