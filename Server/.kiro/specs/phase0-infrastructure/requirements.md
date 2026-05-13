# Requirements Document

## Introduction

Phase 0 establishes the foundational infrastructure for the Wasl SaaS multi-tenant e-commerce platform server. This phase focuses on building the shared middleware, utilities, type definitions, configuration, and service patterns that all subsequent feature modules depend on. The goal is a production-ready Express application skeleton with centralized error handling, request validation, consistent API responses, rate limiting, security hardening, and a reusable base service layer.

## Glossary

- **App**: The Express.js HTTP server application
- **Error_Handler**: The centralized Express error-handling middleware that catches and formats all errors
- **Validation_Middleware**: A generic middleware factory that validates request data against Zod schemas
- **Rate_Limiter**: An Express middleware that limits the number of requests per IP within a time window
- **Base_Service**: A generic service class providing reusable CRUD operations with pagination, filtering, and soft delete
- **Health_Endpoint**: An HTTP GET endpoint that reports application and database connectivity status
- **API_Response**: A utility that formats all outgoing JSON responses into a consistent structure
- **Async_Handler**: A wrapper function that catches rejected promises in async route handlers and forwards them to the error handler
- **Router_Aggregator**: The central module that mounts all route groups onto the Express app
- **AppRequest**: An extended Express Request interface carrying authenticated user context, store context, and permissions

## Requirements

### Requirement 1: Centralized Error Handling

**User Story:** As a developer, I want all errors to be caught and formatted consistently, so that API consumers receive predictable error responses and no unhandled errors crash the server.

#### Acceptance Criteria

1. WHEN an AppError is thrown in a route handler, THE Error_Handler SHALL respond with the AppError's statusCode and message in the standard API response format
2. WHEN a Prisma P2002 (unique constraint violation) error occurs, THE Error_Handler SHALL respond with HTTP 409 and a message indicating which field caused the conflict
3. WHEN a Prisma P2025 (record not found) error occurs, THE Error_Handler SHALL respond with HTTP 404 and a descriptive not-found message
4. WHEN a Zod validation error occurs, THE Error_Handler SHALL respond with HTTP 422 and include the array of field-level validation issues
5. WHEN an unknown or non-operational error occurs, THE Error_Handler SHALL respond with HTTP 500, log the full error details to the console, and return a generic error message to the client
6. THE Error_Handler SHALL set the `success` field to `false` in all error responses
7. WHILE the application is running, THE App SHALL handle uncaught exceptions and unhandled promise rejections by logging the error and gracefully shutting down the process

### Requirement 2: Request Validation Middleware

**User Story:** As a developer, I want a reusable validation middleware that validates request body, query parameters, and route params against Zod schemas, so that invalid data is rejected before reaching controllers.

#### Acceptance Criteria

1. WHEN `validateBody(schema)` is applied to a route and the request body fails schema validation, THE Validation_Middleware SHALL pass a Zod validation error to the next error handler
2. WHEN `validateQuery(schema)` is applied to a route and the query parameters fail schema validation, THE Validation_Middleware SHALL pass a Zod validation error to the next error handler
3. WHEN `validateParams(schema)` is applied to a route and the route params fail schema validation, THE Validation_Middleware SHALL pass a Zod validation error to the next error handler
4. WHEN validation succeeds, THE Validation_Middleware SHALL replace the corresponding request property (body, query, or params) with the parsed and coerced output from Zod
5. THE Validation_Middleware SHALL accept any Zod schema as a generic parameter to enable type-safe parsed output

### Requirement 3: Express Application Setup

**User Story:** As a developer, I want the Express application configured with security headers, rate limiting, request logging, cookie parsing, and proper CORS, so that the server is production-ready from day one.

#### Acceptance Criteria

1. THE App SHALL apply Helmet middleware for security headers on all routes
2. THE App SHALL apply a global rate limiter that restricts requests per IP based on configurable window and max values
3. THE App SHALL use Morgan for HTTP request logging in a configurable format
4. THE App SHALL parse JSON request bodies with a configurable size limit
5. THE App SHALL parse URL-encoded request bodies with extended mode enabled
6. THE App SHALL use cookie-parser middleware for reading signed and unsigned cookies
7. THE App SHALL configure CORS with allowed origins read from environment configuration
8. THE App SHALL mount the Error_Handler as the last middleware in the chain

### Requirement 4: Configuration Improvements

**User Story:** As a developer, I want all environment-dependent values centralized in a typed configuration object, so that secrets and tunables are managed in one place with validation.

#### Acceptance Criteria

1. THE App SHALL read and expose a refresh token secret from environment variables
2. THE App SHALL read and expose access token and refresh token expiry durations from environment variables
3. THE App SHALL read and expose bcrypt salt rounds from environment variables with a default of 12
4. THE App SHALL read and expose rate limiter window (in minutes) and max requests from environment variables
5. THE App SHALL read and expose allowed CORS origins as a comma-separated list from environment variables
6. THE App SHALL read and expose the Node environment (development, production, test) from environment variables

### Requirement 5: Shared TypeScript Types

**User Story:** As a developer, I want shared TypeScript interfaces for request objects, pagination, and API responses, so that all modules use consistent type definitions.

#### Acceptance Criteria

1. THE App SHALL export an `AppRequest` interface extending Express Request with optional `user`, `storeId`, `storeRole`, and `permissions` fields
2. THE App SHALL export a `PaginationParams` interface with `page`, `limit`, `sortBy`, and `sortOrder` fields
3. THE App SHALL export a `PaginatedResult<T>` interface with `data`, `meta.total`, `meta.page`, `meta.limit`, and `meta.totalPages` fields
4. THE App SHALL export an `ApiResponse<T>` interface with `success`, optional `data`, optional `error`, and optional `message` fields

### Requirement 6: API Response Utility

**User Story:** As a developer, I want helper functions that build consistent success and error response objects, so that all controllers return the same JSON structure.

#### Acceptance Criteria

1. WHEN a controller calls `sendSuccess(res, data, message, statusCode)`, THE API_Response SHALL send a JSON response with `success: true`, the provided data, message, and HTTP status code
2. WHEN a controller calls `sendError(res, error, message, statusCode)`, THE API_Response SHALL send a JSON response with `success: false`, the provided error details, message, and HTTP status code
3. WHEN a controller calls `sendPaginated(res, data, meta)`, THE API_Response SHALL send a JSON response with `success: true`, the data array, and pagination metadata

### Requirement 7: Async Handler Utility

**User Story:** As a developer, I want a wrapper that catches async errors in route handlers, so that I do not need try-catch blocks in every controller function.

#### Acceptance Criteria

1. WHEN an async route handler wrapped with Async_Handler throws or rejects, THE Async_Handler SHALL catch the error and pass it to the Express `next` function
2. WHEN an async route handler wrapped with Async_Handler resolves successfully, THE Async_Handler SHALL allow the response to proceed normally
3. THE Async_Handler SHALL preserve the original function signature compatible with Express route handlers

### Requirement 8: Route Structure

**User Story:** As a developer, I want a modular route structure with a central aggregator, so that new feature routes can be added without modifying the main application file.

#### Acceptance Criteria

1. THE Router_Aggregator SHALL mount auth routes under the `/api/auth` prefix
2. THE Router_Aggregator SHALL mount platform admin routes under the `/api/platform` prefix
3. THE Router_Aggregator SHALL mount store admin routes under the `/api/stores/:storeId` prefix
4. THE Router_Aggregator SHALL mount storefront routes under the `/api/stores/:domain` prefix
5. WHEN a request path does not match any registered route, THE App SHALL respond with HTTP 404 and a not-found error in the standard API response format

### Requirement 9: Base Service Pattern

**User Story:** As a developer, I want a generic base service class that provides paginated listing, find-by-id, create, update, and soft-delete operations, so that domain services can inherit common CRUD logic.

#### Acceptance Criteria

1. WHEN `findAll` is called with pagination parameters, THE Base_Service SHALL return a paginated result with correct total count, page, limit, and total pages
2. WHEN `findAll` is called with filter parameters, THE Base_Service SHALL apply the filters as Prisma `where` conditions
3. WHEN `findAll` is called with sort parameters, THE Base_Service SHALL order results by the specified field and direction
4. WHEN `findById` is called with a valid ID, THE Base_Service SHALL return the matching record or null
5. WHEN `create` is called with valid data, THE Base_Service SHALL insert a new record and return it
6. WHEN `update` is called with a valid ID and data, THE Base_Service SHALL update the record and return the updated version
7. WHEN `softDelete` is called with a valid ID, THE Base_Service SHALL set a `deleted_at` timestamp on the record instead of physically deleting it
8. THE Base_Service SHALL scope all queries by `store_id` when a store context is provided

### Requirement 10: Health Check Endpoint

**User Story:** As a DevOps engineer, I want a health check endpoint that verifies database connectivity, so that load balancers and monitoring tools can determine service availability.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/health`, THE Health_Endpoint SHALL attempt a simple database query to verify connectivity
2. WHEN the database query succeeds, THE Health_Endpoint SHALL respond with HTTP 200 and status "healthy" including uptime and timestamp
3. WHEN the database query fails, THE Health_Endpoint SHALL respond with HTTP 503 and status "unhealthy" with the error description
4. THE Health_Endpoint SHALL respond without requiring authentication

### Requirement 11: Common Validation Schemas

**User Story:** As a developer, I want shared Zod schemas for pagination and common ID parameters, so that validation logic is not duplicated across modules.

#### Acceptance Criteria

1. THE App SHALL export a `paginationSchema` that validates and coerces `page` (positive integer, default 1), `limit` (positive integer between 1 and 100, default 20), `sortBy` (optional string), and `sortOrder` (optional, "asc" or "desc", default "desc")
2. THE App SHALL export an `idParamSchema` that validates `id` as a coerced positive integer
3. THE App SHALL export a `storeIdParamSchema` that validates `storeId` as a coerced positive integer

### Requirement 12: Rate Limiter Middleware

**User Story:** As a developer, I want a configurable rate limiter middleware, so that the API is protected from abuse and brute-force attacks.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL limit requests per IP address based on the configured window and max values from App configuration
2. WHEN a client exceeds the rate limit, THE Rate_Limiter SHALL respond with HTTP 429 and a standard error response with a "Too many requests" message
3. THE Rate_Limiter SHALL include standard rate limit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset) in responses
