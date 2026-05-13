import { describe, it, expect } from "vitest";
import { createResponse } from "node-mocks-http";
import {
  sendSuccess,
  sendError,
  sendPaginated,
} from "../../../utils/apiResponse";

describe("apiResponse", () => {
  describe("sendSuccess", () => {
    it("sets status 200 by default", () => {
      const res = createResponse();
      sendSuccess(res as any, { id: 1 });

      expect(res.statusCode).toBe(200);
    });

    it("sets Content-Type to application/json", () => {
      const res = createResponse();
      sendSuccess(res as any, { id: 1 });

      expect(res.getHeader("Content-Type")).toBe("application/json");
    });

    it("returns JSON body with success:true and data", () => {
      const res = createResponse();
      const data = { id: 1, name: "Test" };
      sendSuccess(res as any, data, "Created");

      const body = res._getJSONData();
      expect(body).toEqual({
        success: true,
        data: { id: 1, name: "Test" },
        message: "Created",
      });
    });

    it("allows custom status code", () => {
      const res = createResponse();
      sendSuccess(res as any, { id: 1 }, "Created", 201);

      expect(res.statusCode).toBe(201);
    });

    it("sets message to undefined when not provided", () => {
      const res = createResponse();
      sendSuccess(res as any, { value: 42 });

      const body = res._getJSONData();
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ value: 42 });
      expect(body.message).toBeUndefined();
    });
  });

  describe("sendError", () => {
    it("sets status 500 by default", () => {
      const res = createResponse();
      sendError(res as any, "Something went wrong");

      expect(res.statusCode).toBe(500);
    });

    it("sets Content-Type to application/json", () => {
      const res = createResponse();
      sendError(res as any, "Error");

      expect(res.getHeader("Content-Type")).toBe("application/json");
    });

    it("returns JSON body with success:false and error string", () => {
      const res = createResponse();
      sendError(res as any, "Not found", "Resource missing", 404);

      const body = res._getJSONData();
      expect(body).toEqual({
        success: false,
        error: "Not found",
        message: "Resource missing",
      });
    });

    it("allows custom status code", () => {
      const res = createResponse();
      sendError(res as any, "Bad request", undefined, 400);

      expect(res.statusCode).toBe(400);
    });

    it("supports error as an object", () => {
      const res = createResponse();
      const errorObj = { field: "email", issue: "invalid" };
      sendError(res as any, errorObj, "Validation failed", 422);

      const body = res._getJSONData();
      expect(body.success).toBe(false);
      expect(body.error).toEqual({ field: "email", issue: "invalid" });
      expect(body.message).toBe("Validation failed");
    });
  });

  describe("sendPaginated", () => {
    it("sets status 200", () => {
      const res = createResponse();
      const meta = { total: 50, page: 1, limit: 10, totalPages: 5 };
      sendPaginated(res as any, [{ id: 1 }], meta);

      expect(res.statusCode).toBe(200);
    });

    it("sets Content-Type to application/json", () => {
      const res = createResponse();
      const meta = { total: 10, page: 1, limit: 10, totalPages: 1 };
      sendPaginated(res as any, [], meta);

      expect(res.getHeader("Content-Type")).toBe("application/json");
    });

    it("returns JSON body with data array and meta object", () => {
      const res = createResponse();
      const data = [{ id: 1 }, { id: 2 }];
      const meta = { total: 20, page: 2, limit: 2, totalPages: 10 };
      sendPaginated(res as any, data, meta, "Page 2");

      const body = res._getJSONData();
      expect(body).toEqual({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        meta: { total: 20, page: 2, limit: 2, totalPages: 10 },
        message: "Page 2",
      });
    });

    it("includes success:true in response", () => {
      const res = createResponse();
      const meta = { total: 0, page: 1, limit: 10, totalPages: 0 };
      sendPaginated(res as any, [], meta);

      const body = res._getJSONData();
      expect(body.success).toBe(true);
    });

    it("handles empty data array", () => {
      const res = createResponse();
      const meta = { total: 0, page: 1, limit: 10, totalPages: 0 };
      sendPaginated(res as any, [], meta);

      const body = res._getJSONData();
      expect(body.data).toEqual([]);
      expect(body.meta).toEqual(meta);
    });
  });
});
