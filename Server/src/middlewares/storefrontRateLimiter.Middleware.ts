import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse";

/**
 * Checkout rate limiter.
 * Limits checkout requests to 5 per minute per IP to prevent abuse.
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: true, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many checkout attempts, please try again later.",
      429,
    );
  },
});

/**
 * Login rate limiter.
 * Limits customer login requests to 5 per minute per IP to prevent brute-force attacks.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: true, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many login attempts, please try again later.",
      429,
    );
  },
});

/**
 * Registration rate limiter.
 * Limits customer registration requests to 3 per minute per IP to prevent spam.
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: true, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many registration attempts, please try again later.",
      429,
    );
  },
});

/**
 * Order lookup rate limiter.
 * Limits guest order lookup requests to 10 per 15 minutes per IP
 * to prevent order enumeration attacks.
 */
export const orderLookupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { default: true, keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.ip ?? "unknown",
  handler: (_req, res) => {
    sendError(
      res,
      "Too many requests",
      "Too many lookup attempts, please try again later.",
      429,
    );
  },
});
