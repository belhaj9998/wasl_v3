import { describe, it, expect, vi } from "vitest";
import { createRequest, createResponse } from "node-mocks-http";
import { z, ZodError } from "zod";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../../../middlewares/validate.Middleware";

describe("validateBody", () => {
  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
  });

  it("passes ZodError to next on invalid body", () => {
    const middleware = validateBody(schema);
    const req = createRequest({ body: { name: "A", email: "not-an-email" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });

  it("replaces req.body with parsed data on valid input", () => {
    const schema = z.object({
      name: z.string().trim(),
      age: z.coerce.number(),
    });
    const middleware = validateBody(schema);
    const req = createRequest({ body: { name: "  Alice  ", age: "25" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: "Alice", age: 25 });
  });

  it("calls next without arguments on valid body", () => {
    const middleware = validateBody(schema);
    const req = createRequest({
      body: { name: "John", email: "john@example.com" },
    });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("does not modify res on validation failure", () => {
    const middleware = validateBody(schema);
    const req = createRequest({ body: {} });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(200); // unchanged default
    expect(res._getData()).toBe("");
  });
});

describe("validateQuery", () => {
  const schema = z.object({
    page: z.coerce.number().int().positive(),
    limit: z.coerce.number().int().positive().max(100),
  });

  it("passes ZodError to next on invalid query", () => {
    const middleware = validateQuery(schema);
    const req = createRequest({ query: { page: "abc", limit: "-1" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });

  it("replaces req.query with parsed data on valid input", () => {
    const middleware = validateQuery(schema);
    const req = createRequest({ query: { page: "2", limit: "20" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 2, limit: 20 });
  });

  it("calls next without arguments on valid query", () => {
    const middleware = validateQuery(schema);
    const req = createRequest({ query: { page: "1", limit: "10" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("passes ZodError when required query params are missing", () => {
    const middleware = validateQuery(schema);
    const req = createRequest({ query: {} });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });
});

describe("validateParams", () => {
  const schema = z.object({
    id: z.coerce.number().int().positive(),
  });

  it("passes ZodError to next on invalid params", () => {
    const middleware = validateParams(schema);
    const req = createRequest({ params: { id: "not-a-number" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });

  it("replaces req.params with parsed data on valid input", () => {
    const middleware = validateParams(schema);
    const req = createRequest({ params: { id: "42" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: 42 });
  });

  it("calls next without arguments on valid params", () => {
    const middleware = validateParams(schema);
    const req = createRequest({ params: { id: "1" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("passes ZodError when param value is negative", () => {
    const middleware = validateParams(schema);
    const req = createRequest({ params: { id: "-5" } });
    const res = createResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ZodError);
  });
});
