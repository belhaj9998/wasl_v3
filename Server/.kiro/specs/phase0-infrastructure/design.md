# Design Document: Phase 0 — Complete Infrastructure

## Overview

This design establishes the foundational server infrastructure for Wasl SaaS. It defines the middleware pipeline, shared utilities, type system, configuration management, route structure, and base service pattern that all subsequent feature modules will build upon.

The architecture follows a layered monolith pattern:

```
Request → Middleware Pipeline → Router → Controller → Service → Prisma → PostgreSQL
                                                          ↓
                                                    Response ← API Response Utility
```

All cross-cutting concerns (error handling, validation, auth, rate limiting) are handled at the middleware layer, keeping controllers thin and focused on orchestration.

## Architecture

```mermaid
graph TD
    Client[Client Request]
    
    subgraph "Middleware Pipeline"
        Helmet[Helmet - Security Headers]
        RateLimit[Rate Limiter]
        Morgan[Morgan - Request Logging]
        CORS[CORS]
        BodyParser[JSON/URL Body Parser]
        CookieParser[Cookie Parser]
    end
    
    subgraph "Route Layer"
        Router[Router Aggregator]
        AuthRoutes[/api/auth/*]
        PlatformRoutes[/api/platform/*]
        StoreRoutes[/api/stores/:storeId/*]
        StorefrontRoutes[/api/stores/:domain/*]
        HealthRoute[/api/health]
    end
    
    subgraph "Controller Layer"
        Validate[Validation Middleware]
        Auth[Auth Middleware]
        Controller[Controller Function]
    end
    
    subgraph "Service Layer"
        BaseService[Base Service]
        DomainService[Domain Services]
    end
    
    subgraph "Data Layer"
        Prisma[Prisma Client]
        PG[(PostgreSQL)]
    end
    
    subgraph "Error Handling"
        AsyncHandler[Async Handler]
        ErrorHandler[Error Handler Middleware]
    end
    
    Client --> Helmet --> RateLimit --> Morgan --> CORS --> BodyParser --> CookieParser
    CookieParser --> Router
    Router --> AuthRoutes
    Router --> PlatformRoutes
    Router --> StoreRoutes
    Router --> StorefrontRoutes
    Router --> HealthRoute
    
    AuthRoutes --> Validate --> Controller
    StoreRoutes --> Auth --> Validate --> Controller
    Controller --> AsyncHandler
    AsyncHandler --> DomainService
    DomainService --> BaseService
    BaseService --> Prisma --> PG
    
    AsyncHandler -->|Error| ErrorHandler
    ErrorHandler --> Client
```

### Design Decisions

1. **Middleware ordering**: Helmet → Rate Limiter → Morgan → CORS → Body Parsers → Cookie Parser → Routes → Error Handler. Security and rate limiting come first to reject bad requests early.

2. **Async Handler pattern**: Instead of try-catch in every controller, a higher-order function wraps async handlers and forwards rejections to Express's error pipeline. This keeps controllers clean.

3. **Base Service as a class**: Using a generic class with Prisma delegate allows domain services to extend it and inherit pagination, filtering, and soft-delete logic without code duplication.

4. **Centralized error classification**: The error handler inspects error types (AppError, PrismaClientKnownRequestError, ZodError) and maps them to appropriate HTTP responses. This single point of error formatting ensures consistency.

5. **Configuration with defaults**: All config values have sensible defaults for development, with environment variables overriding them in production. No Zod validation on config at startup — keep it simple with typed access.

## Components and Interfaces

### 1. Configuration (`src/configs/App.config.ts`)

```typescript
export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  appName: string;
  databaseUrl: string;
  
  // JWT
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiry: string;    // e.g., "15m"
  jwtRefreshExpiry: string;   // e.g., "7d"
  
  // Security
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigins: string[];
}

export const config: AppConfig;
```

### 2. Shared Types (`src/types/index.ts`)

```typescript
import { Request } from 'express';

export interface AppRequest extends Request {
  user?: {
    userId: number;
    email?: string;
    phone?: string;
  };
  storeId?: number;
  storeRole?: string;
  permissions?: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Record<string, string[]>;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
```

### 3. Error Handler Middleware (`src/middlewares/error.Middleware.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Centralized error handler.
 * Must be registered LAST in the middleware chain.
 * Signature: (err, req, res, next) — Express identifies 4-arg functions as error handlers.
 */
export const errorHandler: (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => void;
```

**Error classification logic:**

| Error Type | Status Code | Response Shape |
|---|---|---|
| `AppError` | `err.statusCode` | `{ success: false, error: err.message, message: err.message }` |
| Prisma P2002 | 409 | `{ success: false, error: "Unique constraint violation", message: "A record with this {field} already exists" }` |
| Prisma P2025 | 404 | `{ success: false, error: "Not found", message: "The requested record does not exist" }` |
| `ZodError` | 422 | `{ success: false, error: flattenedIssues, message: "Validation failed" }` |
| Unknown | 500 | `{ success: false, error: "Internal server error", message: "An unexpected error occurred" }` |

### 4. Validation Middleware (`src/middlewares/validate.Middleware.ts`)

```typescript
import { z } from 'zod';

export function validateBody<T extends z.ZodType>(schema: T): RequestHandler;
export function validateQuery<T extends z.ZodType>(schema: T): RequestHandler;
export function validateParams<T extends z.ZodType>(schema: T): RequestHandler;
```

Each function returns an Express middleware that:
1. Parses the relevant request property against the schema
2. On success: replaces `req.body`/`req.query`/`req.params` with the parsed output
3. On failure: calls `next(zodError)` to forward to the error handler

### 5. Async Handler (`src/utils/asyncHandler.ts`)

```typescript
import { Request, Response, NextFunction } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

export const asyncHandler: (fn: AsyncRouteHandler) => RequestHandler;
```

Implementation wraps the async function in a try-catch (or `.catch(next)`) pattern.

### 6. API Response Utility (`src/utils/apiResponse.ts`)

```typescript
import { Response } from 'express';
import { PaginationMeta } from '../types';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode?: number): void;
export function sendError(res: Response, error: string | object, message?: string, statusCode?: number): void;
export function sendPaginated<T>(res: Response, data: T[], meta: PaginationMeta, message?: string): void;
```

### 7. Rate Limiter (`src/middlewares/rateLimiter.Middleware.ts`)

```typescript
import rateLimit from 'express-rate-limit';
import { config } from '../configs/App.config';

export const globalRateLimiter: RequestHandler;
```

Uses `express-rate-limit` configured with `config.rateLimitWindowMs` and `config.rateLimitMax`. Returns a standard API error response on limit exceeded.

### 8. Base Service (`src/services/base.Service.ts`)

```typescript
export class BaseService<T, CreateInput, UpdateInput> {
  constructor(
    protected readonly model: any,  // Prisma delegate
    protected readonly storeId?: number
  );

  async findAll(params: PaginationParams, filters?: Record<string, unknown>): Promise<PaginatedResult<T>>;
  async findById(id: number): Promise<T | null>;
  async create(data: CreateInput): Promise<T>;
  async update(id: number, data: UpdateInput): Promise<T>;
  async softDelete(id: number): Promise<T>;
}
```

**Key behaviors:**
- `findAll`: Builds a `where` clause from filters + `store_id` scoping + `deleted_at: null`. Calculates `skip`/`take` from pagination. Runs count + findMany in parallel.
- `softDelete`: Sets `deleted_at = new Date()` instead of deleting the record.
- All queries include `store_id` in the where clause when `storeId` is provided.

### 9. Router Aggregator (`src/routes/index.ts`)

```typescript
import { Router } from 'express';

const router: Router;

// Mounts:
// router.use('/api/auth', authRoutes);
// router.use('/api/platform', platformRoutes);
// router.use('/api/stores/:storeId', storeAdminRoutes);
// router.use('/api/stores/:domain', storefrontRoutes);
// router.get('/api/health', healthController);

export default router;
```

### 10. Health Check (`/api/health`)

```typescript
// Inline in routes or a small controller
// Executes: SELECT 1 via prisma.$queryRaw
// Returns: { status: 'healthy', uptime: process.uptime(), timestamp: new Date() }
// On failure: { status: 'unhealthy', error: message }
```

### 11. Common Validators (`src/validators/common.validator.ts`)

```typescript
import { z } from 'zod';

export const paginationSchema: z.ZodObject<{
  page: z.ZodDefault<z.ZodNumber>;
  limit: z.ZodDefault<z.ZodNumber>;
  sortBy: z.ZodOptional<z.ZodString>;
  sortOrder: z.ZodDefault<z.ZodEnum<['asc', 'desc']>>;
}>;

export const idParamSchema: z.ZodObject<{ id: z.ZodNumber }>;
export const storeIdParamSchema: z.ZodObject<{ storeId: z.ZodNumber }>;
```

## Data Models

This phase does not introduce new database models. It operates on the existing Prisma schema (35+ models already defined). The relevant data structures are the TypeScript interfaces defined in the Components section above:

- `AppConfig` — Configuration shape
- `AppRequest` — Extended request with auth context
- `ApiResponse<T>` — Standard response envelope
- `PaginationParams` — Input for paginated queries
- `PaginationMeta` — Pagination metadata in responses
- `PaginatedResult<T>` — Combined data + meta for list endpoints

The Base Service pattern works generically across any Prisma model that has:
- An `id` field (autoincrement integer)
- A `store_id` field (for multi-tenant scoping)
- An optional `deleted_at` field (for soft delete support)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Error handler classifies all error types correctly

*For any* error object passed to the error handler — whether an AppError with arbitrary statusCode/message, a Prisma P2002 error with arbitrary target fields, a ZodError with arbitrary issues, or an unknown Error — the handler SHALL always return a JSON response with `success: false`, the correct HTTP status code for that error type, and never leak internal details for unknown errors.

**Validates: Requirements 1.1, 1.2, 1.4, 1.5, 1.6**

### Property 2: Validation middleware rejects all non-conforming input

*For any* Zod schema and any input object that does not conform to that schema, the validation middleware (body, query, or params variant) SHALL always call `next()` with a ZodError and never allow the request to proceed to the controller.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Validation middleware replaces input with parsed output

*For any* Zod schema with coercion rules and any valid input, the validation middleware SHALL replace the corresponding request property with the schema's parsed output (including type coercions and defaults applied).

**Validates: Requirements 2.4**

### Property 4: API response utilities produce consistent format

*For any* data value, message string, and status code, `sendSuccess` SHALL produce a response with `success: true` and the exact data/message/statusCode provided; `sendError` SHALL produce a response with `success: false` and the exact error/message/statusCode provided; `sendPaginated` SHALL produce a response with `success: true`, the exact data array, and the exact pagination meta provided.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 5: Async handler forwards all rejected promises

*For any* async function that throws or rejects with an arbitrary error, wrapping it with `asyncHandler` SHALL result in `next()` being called with that exact error, and the error SHALL never be swallowed.

**Validates: Requirements 7.1**

### Property 6: Pagination calculation correctness

*For any* total record count ≥ 0, page ≥ 1, and limit ≥ 1, the Base Service `findAll` SHALL return `totalPages = Math.ceil(total / limit)`, `skip = (page - 1) * limit`, and the meta object SHALL accurately reflect the provided page and limit values.

**Validates: Requirements 9.1**

### Property 7: Base Service multi-tenant store scoping

*For any* Base Service instance constructed with a `storeId`, all query operations (findAll, findById, softDelete) SHALL include `store_id: storeId` in the Prisma `where` clause, ensuring no cross-tenant data leakage.

**Validates: Requirements 9.8**

### Property 8: Common Zod schemas validate and coerce correctly

*For any* string input representing a valid positive integer, the `idParamSchema` and `storeIdParamSchema` SHALL coerce it to a number; for any non-numeric or non-positive string, they SHALL reject it. *For any* valid pagination input, the `paginationSchema` SHALL coerce string numbers to integers, apply defaults for missing fields, and reject values outside bounds (limit 1-100, page ≥ 1).

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 9: CORS origins configuration parsing

*For any* comma-separated string of origins (with or without whitespace around commas), the configuration parser SHALL produce an array where each element is a trimmed, non-empty origin string, and the array length equals the number of comma-separated segments with non-empty content.

**Validates: Requirements 4.5**

## Error Handling

### Error Flow

```mermaid
graph TD
    A[Route Handler throws/rejects] --> B{asyncHandler catches}
    B --> C[next(error)]
    C --> D{Error Handler classifies}
    D -->|AppError| E[Use statusCode + message]
    D -->|Prisma P2002| F[409 + field conflict message]
    D -->|Prisma P2025| G[404 + not found message]
    D -->|ZodError| H[422 + flattened issues]
    D -->|Unknown| I[500 + generic message + console.error]
    E --> J[Send ApiResponse with success:false]
    F --> J
    G --> J
    H --> J
    I --> J
```

### Error Classification Strategy

1. **Check `instanceof AppError`** — Use its statusCode and message directly
2. **Check Prisma error** — Look for `code` property matching P2002 or P2025 on `PrismaClientKnownRequestError`
3. **Check ZodError** — Look for `issues` array (Zod 4 uses `z.ZodError` class)
4. **Fallback** — Log full error, return 500 with generic message

### Process-Level Error Handling

```typescript
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});
```

### Non-Operational Errors

Errors with `isOperational: false` (like `AppError.internal()`) indicate programming bugs. In production, these should trigger alerts. The error handler still returns 500 but logs at error level.

## Testing Strategy

### Property-Based Testing

This feature is suitable for property-based testing. The core utilities (error handler, validation middleware, API response helpers, async handler, pagination logic, schema validation) are pure or near-pure functions with clear input/output behavior and large input spaces.

**Library**: [fast-check](https://github.com/dubzzz/fast-check) — the standard PBT library for TypeScript/JavaScript.

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: phase0-infrastructure, Property {N}: {title}`

### Test Categories

| Category | What's Tested | Approach |
|---|---|---|
| Property tests | Error classification, validation middleware, API response formatting, async handler, pagination math, store scoping, schema coercion, CORS parsing | fast-check with 100+ iterations |
| Unit tests (example) | P2025 mapping, health check responses, 404 catch-all, bcrypt default | Jest/Vitest with specific examples |
| Integration tests | Rate limiting, health check DB connectivity, route mounting, filter/sort in Base Service | Supertest with test database |
| Smoke tests | Helmet headers, Morgan, cookie-parser, middleware ordering, TypeScript types | Compilation + single request verification |

### Test File Structure

```
src/
├── __tests__/
│   ├── middlewares/
│   │   ├── error.Middleware.test.ts
│   │   └── validate.Middleware.test.ts
│   ├── utils/
│   │   ├── apiResponse.test.ts
│   │   └── asyncHandler.test.ts
│   ├── services/
│   │   └── base.Service.test.ts
│   ├── validators/
│   │   └── common.validator.test.ts
│   └── configs/
│       └── App.config.test.ts
```

### Dual Testing Approach

- **Property tests** verify universal correctness across all inputs (e.g., "for any error, the handler produces the right status code")
- **Unit tests** verify specific examples and edge cases (e.g., "P2025 returns exactly 404")
- **Integration tests** verify wiring and external dependencies (e.g., "rate limiter actually blocks after N requests")

Both are complementary: property tests catch unexpected edge cases through randomization, while unit tests document specific expected behaviors.

