# Design Document: Phase 1 — Authentication & Platform Administration

## Overview

This design implements the authentication system and platform administration layer for Wasl SaaS. It builds on the Phase 0 infrastructure (Express middleware pipeline, BaseService, centralized error handling, Zod validation) to deliver:

- **Auth Module**: Registration, login/logout, JWT dual-token strategy (access + refresh), password reset flow, profile management
- **Platform Module**: Admin-only endpoints for managing users, stores, subscription plans, subscriptions, permissions, and dashboard analytics
- **Store Creation**: Authenticated user flow to create a new store with default roles and membership

The architecture follows the existing controller → service → Prisma pattern with Zod schemas for input validation, `asyncHandler` for error propagation, and the centralized `errorHandler` for consistent API responses.

---

## Architecture

```mermaid
graph TD
    subgraph Client
        A[Frontend / API Consumer]
    end

    subgraph Express Server
        subgraph Middleware Pipeline
            M1[CORS + Helmet + Morgan]
            M2[cookie-parser]
            M3[globalRateLimiter]
            M4[authRateLimiter — login/forgot-password only]
            M5[validateBody / validateQuery / validateParams]
            M6[verifyToken]
            M7[platformGuard]
        end

        subgraph Auth Routes — /api/auth
            R1[POST /register]
            R2[POST /login]
            R3[POST /logout]
            R4[POST /refresh]
            R5[POST /forgot-password]
            R6[POST /reset-password]
            R7[GET /me]
            R8[PATCH /me]
            R9[POST /change-password]
            R10[POST /stores]
        end

        subgraph Platform Routes — /api/platform
            P1[GET /users]
            P2[GET /users/:id]
            P3[PATCH /users/:id]
            P4[DELETE /users/:id]
            P5[GET /stores]
            P6[GET /stores/:id]
            P7[PATCH /stores/:id/status]
            P8[DELETE /stores/:id]
            P9[CRUD /plans]
            P10[CRUD /subscriptions]
            P11[CRUD /permissions]
            P12[GET /dashboard/*]
        end

        subgraph Services
            S1[AuthService]
            S2[TokenService]
            S3[PlatformUserService]
            S4[PlatformStoreService]
            S5[PlanService]
            S6[SubscriptionService]
            S7[PermissionService]
            S8[DashboardService]
            S9[StoreCreationService]
        end

        subgraph Data Layer
            DB[(PostgreSQL via Prisma)]
        end
    end

    A --> M1 --> M2 --> M3
    M3 --> R1 & R2 & R5
    M4 -.-> R2 & R5
    R1 --> S1
    R2 --> S1
    R3 --> M6 --> S1
    R4 --> S2
    R7 --> M6 --> S1
    R8 --> M6 --> S1
    R9 --> M6 --> S1
    R10 --> M6 --> S9
    P1 --> M6 --> M7 --> S3
    S1 --> DB
    S2 --> DB
    S3 --> DB
    S4 --> DB
    S5 --> DB
    S6 --> DB
    S7 --> DB
    S8 --> DB
    S9 --> DB
```

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| DB-stored refresh tokens | Enables server-side revocation on logout; prevents token reuse after compromise |
| Soft delete via `deleted_at` | Preserves audit trail; allows recovery; existing BaseService already filters `deleted_at: null` |
| Reset token on User model | Simpler than a separate table for a single-use, short-lived token; hashed for security |
| Separate TokenService | Single responsibility; isolates JWT logic from business logic |
| Platform Guard as middleware | Reusable across all platform routes; clean separation from auth verification |
| Auth-specific rate limiter | Stricter limits (5 req/15min) on login/forgot-password to prevent brute force without affecting other endpoints |

---

## Components and Interfaces

### 1. Schema Migration (Prisma)

Add to existing models:

```prisma
model User {
  // ... existing fields
  deleted_at             DateTime?
  reset_token            String?
  reset_token_expires_at DateTime?
  refresh_tokens         RefreshToken[]
}

model Store {
  // ... existing fields
  deleted_at DateTime?
}

model SubscriptionPlan {
  // ... existing fields
  deleted_at DateTime?
}

model RefreshToken {
  id         Int      @id @default(autoincrement())
  user_id    Int
  token      String   // hashed token
  expires_at DateTime
  created_at DateTime @default(now())
  user       User     @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([token])
}
```

### 2. TokenService

```typescript
interface TokenService {
  generateAccessToken(payload: { userId: number; systemRole: SystemRole }): string;
  generateRefreshToken(userId: number): Promise<string>; // stores hashed in DB, returns raw
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(rawToken: string): Promise<RefreshTokenPayload>;
  revokeRefreshToken(userId: number, rawToken: string): Promise<void>;
  revokeAllUserTokens(userId: number): Promise<void>;
  setRefreshCookie(res: Response, token: string): void;
  clearRefreshCookie(res: Response): void;
}
```

### 3. AuthService

```typescript
interface AuthService {
  register(data: RegisterInput): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }>;
  login(data: LoginInput): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }>;
  logout(userId: number, refreshToken: string): Promise<void>;
  getProfile(userId: number): Promise<UserProfile>;
  updateProfile(userId: number, data: UpdateProfileInput): Promise<UserProfile>;
  changePassword(userId: number, data: ChangePasswordInput): Promise<void>;
  forgotPassword(email: string): Promise<void>;
  resetPassword(data: ResetPasswordInput): Promise<void>;
}
```

### 4. PlatformGuard Middleware

```typescript
// Executes AFTER verifyToken
function platformGuard(req: AppRequest, res: Response, next: NextFunction): void;
// Checks req.user.systemRole ∈ {PLATFORM_ADMIN, PLATFORM_OWNER}
// Returns 403 "Insufficient system role" if not
```

### 5. Auth Rate Limiter

```typescript
// Stricter rate limiter for auth-sensitive endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => sendError(res, "Too many requests", "Too many attempts, please try again later.", 429),
});
```

### 6. Platform Services

```typescript
// PlatformUserService extends BaseService<User>
// PlatformStoreService extends BaseService<Store>
// PlanService extends BaseService<SubscriptionPlan>
// SubscriptionService — custom (no BaseService, complex relations)
// PermissionService — custom (no soft delete on Permission)
// DashboardService — read-only aggregation queries
// StoreCreationService — orchestrates store + roles + membership creation in a transaction
```

### 7. Zod Validation Schemas

```typescript
// Auth schemas
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^\+?\d{7,15}$/),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  identifier: z.string(), // email or phone — validated in service
  password: z.string().min(1).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1).max(128),
  new_password: z.string().min(8).max(128),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar_url: z.string().url().max(2048).optional(),
});

// Store creation schema
const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().min(3).max(63).regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/),
});

// Platform schemas
const platformUpdateUserSchema = z.object({
  is_active: z.boolean().optional(),
  system_role: z.nativeEnum(SystemRole).optional(),
});

const platformUpdateStoreStatusSchema = z.object({
  status: z.nativeEnum(StoreStatus),
});

const createPlanSchema = z.object({
  code: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  price_monthly: z.number().min(0.01).max(999999.99),
  price_yearly: z.number().min(0.01).max(9999999.99).optional(),
  max_stores: z.number().int().min(1).max(10000).optional(),
  max_products: z.number().int().min(1).max(1000000).optional(),
  max_staff: z.number().int().min(1).max(10000).optional(),
});
```

### 8. Route Structure

```
/api/auth
  POST   /register          → [authRateLimiter, validateBody(registerSchema), authController.register]
  POST   /login             → [authRateLimiter, validateBody(loginSchema), authController.login]
  POST   /logout            → [verifyToken, authController.logout]
  POST   /refresh           → [authController.refresh]
  POST   /forgot-password   → [authRateLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword]
  POST   /reset-password    → [validateBody(resetPasswordSchema), authController.resetPassword]
  GET    /me                → [verifyToken, authController.getProfile]
  PATCH  /me                → [verifyToken, validateBody(updateProfileSchema), authController.updateProfile]
  POST   /change-password   → [verifyToken, validateBody(changePasswordSchema), authController.changePassword]
  POST   /stores            → [verifyToken, validateBody(createStoreSchema), storeCreationController.create]

/api/platform
  // All routes: [verifyToken, platformGuard, ...]
  GET    /users             → [validateQuery(paginationSchema), platformUserController.list]
  GET    /users/:id         → [validateParams(idParamSchema), platformUserController.getById]
  PATCH  /users/:id         → [validateParams(idParamSchema), validateBody(platformUpdateUserSchema), platformUserController.update]
  DELETE /users/:id         → [validateParams(idParamSchema), platformUserController.delete]

  GET    /stores            → [validateQuery(paginationSchema), platformStoreController.list]
  GET    /stores/:id        → [validateParams(idParamSchema), platformStoreController.getById]
  PATCH  /stores/:id/status → [validateParams(idParamSchema), validateBody(platformUpdateStoreStatusSchema), platformStoreController.updateStatus]
  DELETE /stores/:id        → [validateParams(idParamSchema), platformStoreController.delete]

  GET    /plans             → planController.list
  POST   /plans             → [validateBody(createPlanSchema), planController.create]
  GET    /plans/:id         → [validateParams(idParamSchema), planController.getById]
  PATCH  /plans/:id         → [validateParams(idParamSchema), validateBody(updatePlanSchema), planController.update]
  DELETE /plans/:id         → [validateParams(idParamSchema), planController.delete]

  GET    /subscriptions     → [validateQuery(paginationSchema), subscriptionController.list]
  GET    /subscriptions/:id → [validateParams(idParamSchema), subscriptionController.getById]
  PATCH  /subscriptions/:id → [validateParams(idParamSchema), validateBody(updateSubscriptionSchema), subscriptionController.update]

  GET    /permissions       → permissionController.list
  POST   /permissions       → [validateBody(createPermissionSchema), permissionController.create]
  PATCH  /permissions/:id   → [validateParams(idParamSchema), validateBody(updatePermissionSchema), permissionController.update]
  DELETE /permissions/:id   → [validateParams(idParamSchema), permissionController.delete]

  GET    /dashboard/stats   → dashboardController.getStats
  GET    /dashboard/revenue → dashboardController.getRevenue
  GET    /dashboard/growth  → [validateQuery(growthQuerySchema), dashboardController.getGrowth]
```

---

## Data Models

### Updated AppRequest Type

```typescript
export interface AppRequest extends Request {
  user?: {
    userId: number;
    email?: string;
    phone?: string;
    systemRole?: SystemRole; // Added for platform guard
  };
  storeId?: number;
  storeRole?: string;
  permissions?: string[];
}
```

### AccessTokenPayload

```typescript
interface AccessTokenPayload {
  userId: number;
  systemRole: SystemRole;
  iat: number;
  exp: number;
}
```

### RefreshTokenPayload

```typescript
interface RefreshTokenPayload {
  userId: number;
  tokenId: number; // RefreshToken.id for targeted revocation
  iat: number;
  exp: number;
}
```

### UserProfile (Response DTO)

```typescript
interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  system_role: SystemRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
```

### Store Status Transition Map

```typescript
const VALID_STORE_TRANSITIONS: Record<StoreStatus, StoreStatus[]> = {
  DRAFT: ['ACTIVE'],
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};
```

### Subscription Status Transition Map

```typescript
const VALID_SUBSCRIPTION_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIALING: ['ACTIVE', 'CANCELED'],
  ACTIVE: ['PAST_DUE', 'CANCELED'],
  PAST_DUE: ['ACTIVE', 'EXPIRED'],
  CANCELED: ['ACTIVE'],
  EXPIRED: [],
};
```

### Dashboard Response Types

```typescript
interface DashboardStats {
  totalUsers: number;
  totalStores: number;
  activeStores: number;
  totalSubscriptions: number;
}

interface RevenueData {
  monthlyRevenue: number; // aggregated from active subscriptions
}

interface GrowthMetric {
  month: string; // YYYY-MM format
  count: number;
}
```

---


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Registration creates user with correct defaults

*For any* valid registration input (name 2-100 chars, valid email, valid phone, password 8-128 chars), the created User record SHALL have `system_role = USER`, `is_active = true`, and the stored password hash SHALL verify against the original password via bcrypt.compare.

**Validates: Requirements 1.1, 1.2**

### Property 2: Email uniqueness enforcement

*For any* existing User record, attempting to register a new user with the same email SHALL result in a 409 Conflict error, regardless of other field values.

**Validates: Requirements 1.3, 1.7**

### Property 3: Phone uniqueness enforcement

*For any* existing User record, attempting to register a new user with the same phone SHALL result in a 409 Conflict error, regardless of other field values.

**Validates: Requirements 1.4**

### Property 4: Access token contains correct claims

*For any* successful authentication (registration or login), the issued Access_Token SHALL decode to contain the correct `userId` and `systemRole` matching the authenticated user's record.

**Validates: Requirements 1.5, 2.1, 2.2**

### Property 5: Login with valid credentials succeeds for any identifier type

*For any* registered, active User and *for any* valid identifier (email or phone) belonging to that user, providing the correct password SHALL result in successful authentication with tokens returned and `last_login_at` updated.

**Validates: Requirements 2.1, 2.2, 2.5**

### Property 6: Login with incorrect password always fails

*For any* registered User and *for any* password that does not match the stored hash, login SHALL return 401 "Invalid credentials".

**Validates: Requirements 2.3**

### Property 7: Inactive users cannot login

*For any* User with `is_active = false`, login SHALL return 403 Forbidden regardless of whether the password is correct.

**Validates: Requirements 2.4**

### Property 8: Logout invalidates refresh token

*For any* authenticated user with a stored RefreshToken, after logout the token record SHALL no longer exist in the database, and attempting to use it for refresh SHALL fail with 401.

**Validates: Requirements 3.2, 4.5**

### Property 9: Refresh token round-trip

*For any* valid, non-revoked RefreshToken that exists in the database and has not expired, calling the refresh endpoint SHALL return a new valid Access_Token. Conversely, *for any* expired, tampered, or revoked token, refresh SHALL fail with 401.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5**

### Property 10: Forgot-password does not leak email existence

*For any* email address (whether registered or not), the forgot-password endpoint SHALL return an identical 200 success response shape, making it impossible to distinguish registered from unregistered emails by response alone.

**Validates: Requirements 5.1, 5.2**

### Property 11: Reset password round-trip

*For any* User with a valid (non-expired) reset token, providing that token with a new password SHALL update the password such that login with the new password succeeds, AND the reset token SHALL be invalidated so a second reset attempt with the same token fails.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 12: Password never appears in API responses

*For any* API endpoint that returns user data (profile, user list, user detail, registration response, login response), the `password` field SHALL never be present in the response body.

**Validates: Requirements 7.1, 7.2, 8.3, 11.1, 11.3**

### Property 13: Soft-deleted users cannot access the system

*For any* User with `deleted_at` set (soft-deleted), attempting to access authenticated endpoints SHALL return 401 Unauthorized.

**Validates: Requirements 7.4**

### Property 14: Profile update only modifies permitted fields

*For any* profile update request containing both permitted fields (name, avatar_url) and protected fields (email, phone, password, system_role, is_active), only the permitted fields SHALL change on the User record; protected fields SHALL remain unchanged.

**Validates: Requirements 8.1, 8.2**

### Property 15: Change password validates current password

*For any* authenticated User, providing an incorrect current password SHALL result in 401, while providing the correct current password with a valid new password (≥8 chars) SHALL update the password such that login with the new password succeeds.

**Validates: Requirements 9.1, 9.2**

### Property 16: Platform Guard role enforcement

*For any* authenticated User, access to platform endpoints SHALL be granted if and only if `system_role ∈ {PLATFORM_ADMIN, PLATFORM_OWNER}`. Users with `USER` or `SUPPORT` roles SHALL receive 403 "Insufficient system role".

**Validates: Requirements 10.1, 10.2**

### Property 17: Platform admin cannot self-delete or self-deactivate

*For any* platform admin user, attempting to delete or deactivate their own account SHALL return 403 Forbidden.

**Validates: Requirements 11.7**

### Property 18: Store status transitions follow valid state machine

*For any* Store with a given current status, updating to a new status SHALL succeed only if the transition is in the valid set: DRAFT→ACTIVE, ACTIVE→SUSPENDED, ACTIVE→ARCHIVED, SUSPENDED→ACTIVE, SUSPENDED→ARCHIVED. All other transitions SHALL return 400.

**Validates: Requirements 12.4, 12.5**

### Property 19: Subscription status transitions follow valid state machine

*For any* StoreSubscription with a given current status, updating to a new status SHALL succeed only if the transition is in the valid set: TRIALING→ACTIVE, TRIALING→CANCELED, ACTIVE→PAST_DUE, ACTIVE→CANCELED, PAST_DUE→ACTIVE, PAST_DUE→EXPIRED, CANCELED→ACTIVE. All other transitions SHALL return 422.

**Validates: Requirements 14.3, 14.7**

### Property 20: Soft delete sets deleted_at timestamp

*For any* soft-deletable entity (User, Store, SubscriptionPlan), performing a soft delete SHALL set `deleted_at` to a non-null timestamp, and subsequent queries through the standard list/getById endpoints SHALL exclude that entity (return 404).

**Validates: Requirements 11.5, 11.6, 12.6, 12.7, 13.5, 13.7**

### Property 21: Unique code constraint on plans and permissions

*For any* existing SubscriptionPlan code or Permission code, attempting to create a new record with the same code SHALL return 409 Conflict.

**Validates: Requirements 13.6, 15.5**

### Property 22: Cannot delete plan/permission in use

*For any* SubscriptionPlan with active StoreSubscription records, deletion SHALL return 409. *For any* Permission assigned to one or more StoreRolePermission records, deletion SHALL return 409.

**Validates: Requirements 13.8, 15.7**

### Property 23: Dashboard revenue calculation correctness

*For any* set of active/trialing StoreSubscriptions, the reported monthly revenue SHALL equal the sum of: `price_monthly` for MONTHLY billing cycles + `price_yearly / 12` for YEARLY billing cycles, using the associated SubscriptionPlan prices.

**Validates: Requirements 16.2, 16.5**

### Property 24: Dashboard growth metrics group stores by month

*For any* time range (start_month, end_month) and *for any* set of stores with known `created_at` dates, the growth endpoint SHALL return the correct count of stores created in each month within the range.

**Validates: Requirements 16.3**

### Property 25: Zod schema validation rejects invalid input

*For any* request body that violates the defined Zod schema constraints (e.g., name < 2 chars, invalid email format, password < 8 chars, phone not matching pattern), the validation middleware SHALL return 422 with field-level error details specifying the field path and failure reason.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7**

### Property 26: Store creation initializes defaults and relationships

*For any* valid store creation request from an authenticated user, the created Store SHALL have `status = DRAFT`, `currency_code = LYD`, `locale = ar-LY`, `timezone = Africa/Tripoli`, AND the system SHALL create all 6 default StoreRole records with correct permissions, AND a StoreMembership linking the creating user with the Owner role and ACTIVE status.

**Validates: Requirements 18.1, 18.2, 18.3, 18.5**

### Property 27: Store domain uniqueness

*For any* existing Store domain, attempting to create a new store with the same domain SHALL return 409 Conflict.

**Validates: Requirements 18.4**

---

## Error Handling

All errors flow through the existing centralized `errorHandler` middleware. The design leverages `AppError` static factories and lets Prisma/Zod errors bubble up naturally.

| Scenario | Error Type | Status | Message |
|----------|-----------|--------|---------|
| Duplicate email/phone/domain/code | Prisma P2002 or AppError.conflict() | 409 | "A record with this {field} already exists" |
| Record not found | AppError.notFound() | 404 | "Resource not found" |
| Invalid credentials | AppError.unauthorized() | 401 | "Invalid credentials" |
| Inactive account login | AppError.forbidden() | 403 | "Account is deactivated" |
| Insufficient role | AppError.forbidden() | 403 | "Insufficient system role" |
| Self-delete attempt | AppError.forbidden() | 403 | "Cannot modify your own account" |
| Invalid state transition | AppError.badRequest() / AppError.unprocessable() | 400/422 | "Transition from X to Y is not allowed" |
| Expired reset token | AppError.badRequest() | 400 | "Reset token has expired" |
| Invalid reset token | AppError.badRequest() | 400 | "Invalid reset token" |
| Wrong current password | AppError.unauthorized() | 401 | "Current password is incorrect" |
| Validation failure | ZodError (via middleware) | 422 | Field-level error array |
| Rate limit exceeded | express-rate-limit handler | 429 | "Too many attempts, please try again later" |
| No token provided | AppError.unauthorized() | 401 | "No token provided" |
| Invalid/expired JWT | AppError.unauthorized() | 401 | "Unauthorized" |
| Plan/permission in use | AppError.conflict() | 409 | "Cannot delete: resource is in use" |

### Error Response Format

All error responses follow the existing format:

```json
{
  "success": false,
  "error": "Error description or field-level array",
  "message": "Human-readable message"
}
```

---

## Testing Strategy

### Testing Framework

- **Unit & Integration Tests**: Jest (to be added as dev dependency)
- **Property-Based Tests**: fast-check (to be added as dev dependency)
- **HTTP Testing**: supertest (to be added as dev dependency)

### Dual Testing Approach

**Unit Tests** (example-based):
- Cookie configuration (httpOnly, secure, sameSite attributes)
- Middleware ordering verification
- Specific response format checks
- Default time period for dashboard growth (last 12 months)
- Edge cases: no refresh token cookie, self-delete prevention

**Property-Based Tests** (universal properties):
- Each correctness property (1-27) maps to one or more property-based tests
- Minimum 100 iterations per property test
- Tag format: `Feature: phase1-auth-platform, Property {N}: {title}`
- Use fast-check for input generation

### Test Organization

```
tests/
├── unit/
│   ├── auth/
│   │   ├── auth.service.test.ts
│   │   ├── token.service.test.ts
│   │   └── auth.validation.test.ts
│   ├── platform/
│   │   ├── platform-user.service.test.ts
│   │   ├── platform-store.service.test.ts
│   │   ├── plan.service.test.ts
│   │   ├── subscription.service.test.ts
│   │   ├── permission.service.test.ts
│   │   └── dashboard.service.test.ts
│   └── middleware/
│       ├── platform-guard.test.ts
│       └── auth-rate-limiter.test.ts
├── property/
│   ├── auth-registration.prop.test.ts
│   ├── auth-login.prop.test.ts
│   ├── token-lifecycle.prop.test.ts
│   ├── password-management.prop.test.ts
│   ├── platform-guard.prop.test.ts
│   ├── state-transitions.prop.test.ts
│   ├── soft-delete.prop.test.ts
│   ├── uniqueness-constraints.prop.test.ts
│   ├── dashboard-calculations.prop.test.ts
│   ├── validation-schemas.prop.test.ts
│   └── store-creation.prop.test.ts
└── integration/
    ├── auth-flow.integration.test.ts
    ├── platform-users.integration.test.ts
    ├── platform-stores.integration.test.ts
    └── platform-plans.integration.test.ts
```

### Property Test Configuration

```typescript
// fast-check configuration for all property tests
const FC_CONFIG = {
  numRuns: 100,        // minimum 100 iterations
  verbose: true,       // show failing examples
  endOnFailure: true,  // stop on first failure for debugging
};
```

### Key Test Generators (fast-check)

```typescript
// Valid registration input generator
const validRegistrationArb = fc.record({
  name: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length >= 2),
  email: fc.emailAddress(),
  phone: fc.stringMatching(/^\+?\d{7,15}$/),
  password: fc.string({ minLength: 8, maxLength: 128 }),
});

// System role generator
const systemRoleArb = fc.constantFrom('USER', 'SUPPORT', 'PLATFORM_ADMIN', 'PLATFORM_OWNER');

// Store status generator
const storeStatusArb = fc.constantFrom('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

// Subscription status generator
const subscriptionStatusArb = fc.constantFrom('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED');
```
