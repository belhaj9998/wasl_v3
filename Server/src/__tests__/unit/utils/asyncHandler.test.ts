import { describe, it, expect, vi } from "vitest";
import { createRequest, createResponse } from "node-mocks-http";
import { asyncHandler } from "../../../utils/asyncHandler";

/** Flush the microtask queue so fire-and-forget .catch(next) settles */
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("asyncHandler", () => {
  describe("rejected promises call next(error)", () => {
    it("forwards async errors to next()", async () => {
      const error = new Error("async failure");
      const handler = asyncHandler(async (_req, _res, _next) => {
        throw error;
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("forwards rejected promise to next()", async () => {
      const error = new Error("promise rejected");
      const handler = asyncHandler(async (_req, _res, _next) => {
        return Promise.reject(error);
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      handler(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
    });

    it("forwards non-Error objects thrown as rejections", async () => {
      const handler = asyncHandler(async (_req, _res, _next) => {
        throw "string error";
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith("string error");
    });
  });

  describe("resolved promises allow response to complete", () => {
    it("does not call next() when handler resolves successfully", async () => {
      const handler = asyncHandler(async (_req, res, _next) => {
        res.status(200).json({ success: true });
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual({ success: true });
    });

    it("allows handler to set headers and send response", async () => {
      const handler = asyncHandler(async (_req, res, _next) => {
        res.setHeader("X-Custom", "value");
        res.status(201).json({ created: true });
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.getHeader("X-Custom")).toBe("value");
      expect(res.statusCode).toBe(201);
    });

    it("allows handler to call next() explicitly for middleware chaining", async () => {
      const handler = asyncHandler(async (_req, _res, next) => {
        next();
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });

  describe("synchronous throws are caught", () => {
    it("catches synchronous errors thrown inside async function", async () => {
      const error = new TypeError("cannot read property");
      const handler = asyncHandler(async (_req, _res, _next) => {
        throw error;
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("catches errors thrown before any await", async () => {
      const error = new RangeError("out of range");
      const handler = asyncHandler(async (_req, _res, _next) => {
        // Error thrown synchronously before any await
        if (true) throw error;
        await Promise.resolve();
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      await handler(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it("catches errors thrown after an await", async () => {
      const error = new Error("post-await error");
      const handler = asyncHandler(async (_req, _res, _next) => {
        await Promise.resolve();
        throw error;
      });

      const req = createRequest();
      const res = createResponse();
      const next = vi.fn();

      handler(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
