# Implementation Plan: Phase 0 — Complete Infrastructure

## Overview

This plan implements the foundational infrastructure for Wasl SaaS server in incremental steps. Each task builds on the previous, starting with configuration and types (no dependencies), then utilities, then middleware, then services, and finally wiring everything together in the Express app and route aggregator.

Implementation language: **TypeScript** (already established in the project).

## Tasks

- [x] 1. Improve configuration and define shared types
  - [x] 1.1 Expand `src/configs/App.config.ts` with all required config fields
    - Add `jwtRefreshSecret`, `jwtAccessExpiry`, `jwtRefreshExpiry`, `bcryptRounds`, `rateLimitWindowMs`, `rateLimitMax`, `corsOrigins` (parsed from comma-separated string), `nodeEnv`
    - Export typed `AppConfig` interface and `config` object
    - Use sensible defaults: bcryptRounds=12, rateLimitWindowMs=15*60*1000, rateLimitMax=100, nodeEnv='development'
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 1.2 Create `src/types/index.ts` with shared TypeScript interfaces
    - Export `AppRequest` (extending Express Request with user, storeId, storeRole, permissions)
    - Export `ApiResponse<T>`, `PaginationParams`, `PaginationMeta`, `PaginatedResult<T>`
    - Remove the `AppRequest` interface from `src/middlewares/auth.Middleware.ts` and import from types instead
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 1.3 Write property test for CORS origins parsing
    - **Property 9: CORS origins configuration parsing**
    - **Validates: Requirements 4.5**

- [x] 2. Create utility modules
  - [x] 2.1 Create `src/utils/asyncHandler.ts`
    - Implement higher-order function that wraps async route handlers
    - Catches rejected promises and forwards to `next(error)`
    - Preserves Express RequestHandler signature
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.2 Write property test for async handler
    - **Property 5: Async handler forwards all rejected promises**
    - **Validates: Requirements 7.1**

  - [x] 2.3 Create `src/utils/apiResponse.ts`
    - Implement `sendSuccess<T>(res, data, message?, statusCode?)` — defaults statusCode to 200
    - Implement `sendError(res, error, message?, statusCode?)` — defaults statusCode to 500
    - Implement `sendPaginated<T>(res, data, meta, message?)` — always 200 with pagination meta
    - All functions set `Content-Type: application/json` and use `res.status().json()`
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 2.4 Write property test for API response utilities
    - **Property 4: API response utilities produce consistent format**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 3. Create middleware modules
  - [x] 3.1 Create `src/middlewares/error.Middleware.ts`
    - Implement centralized error handler with 4-argument Express signature
    - Classify errors: AppError → use statusCode/message; Prisma P2002 → 409 with field; Prisma P2025 → 404; ZodError → 422 with issues; Unknown → 500 with generic message
    - Always set `success: false` in response
    - Log unknown errors with `console.error`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ]* 3.2 Write property test for error handler
    - **Property 1: Error handler classifies all error types correctly**
    - **Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.6**

  - [x] 3.3 Create `src/middlewares/validate.Middleware.ts`
    - Implement `validateBody(schema)` — parses req.body, replaces on success, calls next(err) on failure
    - Implement `validateQuery(schema)` — parses req.query, replaces on success, calls next(err) on failure
    - Implement `validateParams(schema)` — parses req.params, replaces on success, calls next(err) on failure
    - Each accepts a generic Zod schema type parameter
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.4 Write property tests for validation middleware
    - **Property 2: Validation middleware rejects all non-conforming input**
    - **Property 3: Validation middleware replaces input with parsed output**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 3.5 Create `src/middlewares/rateLimiter.Middleware.ts`
    - Use `express-rate-limit` with config values for windowMs and max
    - Configure standardHeaders (RateLimit-*) and legacyHeaders disabled
    - Custom handler that returns standard API error response format with 429
    - _Requirements: 12.1, 12.2, 12.3_

- [x] 4. Checkpoint — Verify utilities and middleware compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create common validators and base service
  - [x] 5.1 Create `src/validators/common.validator.ts`
    - Implement `paginationSchema` with page (default 1, positive int, coerced), limit (default 20, 1-100, coerced), sortBy (optional string), sortOrder (optional enum 'asc'|'desc', default 'desc')
    - Implement `idParamSchema` with id as coerced positive integer
    - Implement `storeIdParamSchema` with storeId as coerced positive integer
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 5.2 Write property test for common validators
    - **Property 8: Common Zod schemas validate and coerce correctly**
    - **Validates: Requirements 11.1, 11.2, 11.3**

  - [x] 5.3 Create `src/services/base.Service.ts`
    - Implement `BaseService<T, CreateInput, UpdateInput>` class
    - Constructor accepts Prisma model delegate and optional storeId
    - `findAll(params, filters?)`: builds where clause with store_id scoping + deleted_at:null + filters, calculates skip/take, runs count+findMany in parallel, returns PaginatedResult
    - `findById(id)`: queries by id + store_id scope + deleted_at:null
    - `create(data)`: inserts with store_id if scoped
    - `update(id, data)`: updates by id + store_id scope
    - `softDelete(id)`: sets deleted_at = new Date() by id + store_id scope
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 5.4 Write property tests for base service
    - **Property 6: Pagination calculation correctness**
    - **Property 7: Base Service multi-tenant store scoping**
    - **Validates: Requirements 9.1, 9.8**

- [x] 6. Wire Express application and routes
  - [x] 6.1 Create `src/routes/index.ts` — Router aggregator
    - Create Express Router
    - Mount placeholder routers for `/api/auth`, `/api/platform`, `/api/stores/:storeId`, `/api/stores/:domain`
    - Add health check route at `/api/health` that runs `SELECT 1` via Prisma and returns status/uptime/timestamp
    - Add catch-all 404 handler for unmatched routes
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 6.2 Rewrite `src/index.ts` — Full Express app setup
    - Apply middleware in order: Helmet → Rate Limiter → Morgan → CORS (with config origins) → JSON body parser (limit from config or 10mb) → URL-encoded parser (extended: true) → Cookie Parser
    - Mount router aggregator
    - Mount error handler as last middleware
    - Add process-level handlers for uncaughtException and unhandledRejection
    - Start server on configured port
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 1.7_

  - [x] 6.3 Update `src/middlewares/auth.Middleware.ts`
    - Import `AppRequest` from `src/types/index.ts` instead of defining it locally
    - Remove the local `AppRequest` interface definition
    - Ensure all existing functionality is preserved
    - _Requirements: 5.1_

- [x] 7. Final checkpoint — Ensure everything compiles and integrates
  - Run `npx tsc --noEmit` to verify no TypeScript errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- The implementation language is TypeScript, matching the existing project setup
- All new files follow the existing project conventions (camelCase files, Prisma singleton import pattern)
