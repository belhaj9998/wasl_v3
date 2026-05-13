import { Response } from "express";
import { PaginationMeta } from "../types";

/**
 * Send a success response with consistent JSON format.
 * Defaults statusCode to 200.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200,
): void {
  res.setHeader("Content-Type", "application/json");
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

/**
 * Send an error response with consistent JSON format.
 * Defaults statusCode to 500.
 */
export function sendError(
  res: Response,
  error: string | object,
  message?: string,
  statusCode: number = 500,
): void {
  res.setHeader("Content-Type", "application/json");
  res.status(statusCode).json({
    success: false,
    error,
    message,
  });
}

/**
 * Send a paginated success response with data array and pagination meta.
 * Always responds with HTTP 200.
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message?: string,
): void {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json({
    success: true,
    data,
    meta,
    message,
  });
}
