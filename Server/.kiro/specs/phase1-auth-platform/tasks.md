# Implementation Plan: Phase 1 — Authentication & Platform Administration

## Overview

This plan implements the authentication system and platform administration layer for Wasl SaaS. It builds on the Phase 0 infrastructure (BaseService, error handler, validation middleware, async handler, API response utils, router aggregator) and follows the controller → service → Prisma pattern. Tasks are ordered to ensure incremental progress: schema migration first, then core services, then controllers/routes, then platform services, and finally wiring everything together.

## Tasks

- [x] 1. Schema migration and shared types
  - [x] 1.1 Update Prisma schema with Phase 1 changes
    - Add `deleted_at DateTime?` to User, Store, and SubscriptionPlan models
    - Add `reset_token String?` and `reset_token_expires_at DateTime?` to User model
    - Add `RefreshToken` model with fields: id, user_id, token (hashed), expires_at, created_at
    - Add `@@index([user_id])` and `@@index([token])` on RefreshToken
    - Add `refresh_tokens RefreshToken[]` relation on User model
    - Run `npx prisma migrate dev --name phase1-auth-platform` to generate and apply migration
    - _Requirements: Prerequisites 1, 2, 3, 4_

  - [x] 1.2 Create shared types and interfaces
    - Create `src/types/auth.types.ts` with AccessTokenPayload, RefreshTokenPayload, UserProfile, RegisterInput, LoginInput, UpdateProfileInput, ChangePasswordInput, ResetPasswordInput interfaces
    - Update `src/types/index.ts` to export AppRequest with systemRole field added
    - Create `src/types/platform.types.ts` with DashboardStats, RevenueData, GrowthMetric, store/subscription status transition maps
    - _Requirements: 7.2, 8.1, 10.1, 12.4, 14.3_

  - [x] 1.3 Create Zod validation schemas
    - Create `src/validators/auth.validators.ts` with registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema, updateProfileSchema, createStoreSchema
    - Create `src/validators/platform.validators.ts` with platformUpdateUserSchema, platformUpdateStoreStatusSchema, createPlanSchema, updatePlanSchema, updateSubscriptionSchema, createPermissionSchema, updatePermissionSchema, paginationSchema, idParamSchema, growthQuerySchema
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

- [x] 2. Core auth services
  - [x] 2.1 Implement TokenService
    - Create `src/services/token.Service.ts`
    - Implement `generateAccessToken(payload)` — signs JWT with userId and systemRole, 15-minute expiry
    - Implement `generateRefreshToken(userId)` — generates random token, hashes with crypto, stores in DB, returns raw token
    - Implement `verifyAccessToken(token)` — verifies JWT signature and expiry, returns AccessTokenPayload
    - Implement `verifyRefreshToken(rawToken)` — hashes raw token, looks up in DB, verifies expiry, returns RefreshTokenPayload
    - Implement `revokeRefreshToken(userId, rawToken)` — deletes matching token record from DB
    - Implement `revokeAllUserTokens(userId)` — deletes all RefreshToken records for user
    - Implement `setRefreshCookie(res, token)` — sets httpOnly, secure, sameSite=strict cookie with 7-day maxAge
    - Implement `clearRefreshCookie(res)` — clears the refresh token cookie
    - _Requirements: 1.5, 1.6, 2.1, 2.6, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 2.2 Write property tests for TokenService
    - **Property 4: Access token contains correct claims**
    - **Property 9: Refresh token round-trip**
    - **Validates: Requirements 1.5, 2.1, 2.2, 4.1, 4.2, 4.3, 4.5**

  - [x] 2.3 Implement AuthService
    - Create `src/services/auth.Service.ts`
    - Implement `register(data)` — validate uniqueness (email first, then phone), hash password with bcrypt 12 rounds, create User, generate tokens, return user profile + tokens
    - Implement `login(data)` — find user by email or phone, check is_active, verify password with bcrypt.compare, update last_login_at, generate tokens
    - Implement `logout(userId, refreshToken)` — revoke refresh token from DB
    - Implement `getProfile(userId)` — find user by ID excluding password, check deleted_at
    - Implement `updateProfile(userId, data)` — update only name and avatar_url fields, ignore protected fields
    - Implement `changePassword(userId, data)` — verify current password, hash new password, update record
    - Implement `forgotPassword(email)` — generate crypto.randomBytes token, hash and store with 1-hour expiry, always return success
    - Implement `resetPassword(data)` — hash provided token, find matching user, verify expiry, update password, clear reset token fields
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 3.2, 3.3, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4_

  - [ ]* 2.4 Write property tests for AuthService registration
    - **Property 1: Registration creates user with correct defaults**
    - **Property 2: Email uniqueness enforcement**
    - **Property 3: Phone uniqueness enforcement**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.7**

  - [ ]* 2.5 Write property tests for AuthService login and password
    - **Property 5: Login with valid credentials succeeds for any identifier type**
    - **Property 6: Login with incorrect password always fails**
    - **Property 7: Inactive users cannot login**
    - **Property 10: Forgot-password does not leak email existence**
    - **Property 11: Reset password round-trip**
    - **Property 15: Change password validates current password**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 6.1, 6.2, 6.3, 6.4, 9.1, 9.2**

- [x] 3. Auth middleware and rate limiter
  - [x] 3.1 Update verifyToken middleware and create platformGuard
    - Update `src/middlewares/auth.Middleware.ts` — modify verifyToken to decode systemRole from token and attach to req.user
    - Create `platformGuard` middleware in same file — checks req.user.systemRole ∈ {PLATFORM_ADMIN, PLATFORM_OWNER}, returns 403 if not
    - Add soft-delete check: if user has deleted_at set, return 401
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 7.3, 7.4_

  - [ ]* 3.2 Write property tests for platformGuard
    - **Property 16: Platform Guard role enforcement**
    - **Property 13: Soft-deleted users cannot access the system**
    - **Validates: Requirements 10.1, 10.2, 7.4**

  - [x] 3.3 Create auth rate limiter
    - Create `src/middlewares/authRateLimiter.Middleware.ts`
    - Configure express-rate-limit with 5 requests per 15-minute window
    - Use `sendError` for the 429 response handler
    - _Requirements: 2.1 (security), 5.1 (security)_

- [x] 4. Checkpoint - Ensure core services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Auth controllers and routes
  - [x] 5.1 Implement AuthController
    - Create `src/controllers/auth/auth.Controller.ts`
    - Implement `register` — validate body, call AuthService.register, set refresh cookie, return 201 with user + accessToken
    - Implement `login` — validate body, call AuthService.login, set refresh cookie, return 200 with user + accessToken
    - Implement `logout` — extract refresh token from cookie, call AuthService.logout, clear cookie, return 200
    - Implement `refresh` — extract refresh token from cookie, call TokenService.verifyRefreshToken, issue new access token, return 200
    - Implement `forgotPassword` — validate body, call AuthService.forgotPassword, return 200
    - Implement `resetPassword` — validate body, call AuthService.resetPassword, return 200
    - Implement `getProfile` — call AuthService.getProfile(req.user.userId), return 200
    - Implement `updateProfile` — validate body, call AuthService.updateProfile, return 200
    - Implement `changePassword` — validate body, call AuthService.changePassword, return 200
    - Wrap all handlers with asyncHandler
    - _Requirements: 1.5, 1.6, 2.1, 2.6, 3.1, 3.2, 3.3, 4.1, 4.4, 5.4, 6.1, 7.1, 8.3, 9.4_

  - [x] 5.2 Implement StoreCreationController
    - Create `src/controllers/auth/storeCreation.Controller.ts`
    - Implement `create` — validate body, call StoreCreationService.createStore(userId, data), return 201 with store data
    - Wrap handler with asyncHandler
    - _Requirements: 18.1, 18.4, 18.6_

  - [x] 5.3 Create auth routes
    - Create `src/routes/auth.routes.ts`
    - Wire all auth endpoints with appropriate middleware chains (authRateLimiter, validateBody, verifyToken)
    - POST /register, POST /login, POST /logout, POST /refresh, POST /forgot-password, POST /reset-password, GET /me, PATCH /me, POST /change-password, POST /stores
    - _Requirements: 1.5, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 18.1_

  - [ ]* 5.4 Write property tests for auth endpoints
    - **Property 8: Logout invalidates refresh token**
    - **Property 12: Password never appears in API responses**
    - **Property 14: Profile update only modifies permitted fields**
    - **Property 25: Zod schema validation rejects invalid input**
    - **Validates: Requirements 3.2, 4.5, 7.1, 8.1, 8.2, 17.1-17.7**

- [x] 6. Platform services
  - [x] 6.1 Implement PlatformUserService
    - Create `src/services/platform/platformUser.Service.ts`
    - Extend BaseService<User> for pagination and soft-delete
    - Implement `list(params, filters)` — paginated user list with role/active/search filters, exclude password
    - Implement `getById(id)` — single user excluding password, 404 if not found or soft-deleted
    - Implement `update(id, data, currentUserId)` — update is_active/system_role, prevent self-modification
    - Implement `delete(id, currentUserId)` — soft delete, prevent self-delete
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [ ]* 6.2 Write property tests for PlatformUserService
    - **Property 17: Platform admin cannot self-delete or self-deactivate**
    - **Property 20: Soft delete sets deleted_at timestamp (User)**
    - **Validates: Requirements 11.5, 11.6, 11.7**

  - [x] 6.3 Implement PlatformStoreService
    - Create `src/services/platform/platformStore.Service.ts`
    - Extend BaseService<Store> for pagination and soft-delete
    - Implement `list(params, filters)` — paginated store list with status/search filters
    - Implement `getById(id)` — single store with subscription plan name and membership count
    - Implement `updateStatus(id, newStatus)` — validate state transition using VALID_STORE_TRANSITIONS map
    - Implement `delete(id)` — soft delete
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [ ]* 6.4 Write property tests for PlatformStoreService
    - **Property 18: Store status transitions follow valid state machine**
    - **Property 20: Soft delete sets deleted_at timestamp (Store)**
    - **Validates: Requirements 12.4, 12.5, 12.6, 12.7**

  - [x] 6.5 Implement PlanService
    - Create `src/services/platform/plan.Service.ts`
    - Extend BaseService<SubscriptionPlan> for pagination and soft-delete
    - Implement `list()` — all plans excluding soft-deleted
    - Implement `create(data)` — create plan, check code uniqueness (409 on conflict)
    - Implement `getById(id)` — single plan, 404 if not found
    - Implement `update(id, data)` — update allowed fields
    - Implement `delete(id)` — check for active subscriptions (409 if in use), then soft delete
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8_

  - [ ]* 6.6 Write property tests for PlanService
    - **Property 21: Unique code constraint on plans**
    - **Property 22: Cannot delete plan in use**
    - **Property 20: Soft delete sets deleted_at timestamp (SubscriptionPlan)**
    - **Validates: Requirements 13.5, 13.6, 13.7, 13.8**

  - [x] 6.7 Implement SubscriptionService
    - Create `src/services/platform/subscription.Service.ts`
    - Implement `list(params)` — paginated subscriptions with related store and plan data
    - Implement `getById(id)` — single subscription with relations, 404 if not found
    - Implement `update(id, data)` — validate status transitions using VALID_SUBSCRIPTION_TRANSITIONS map, update period/plan as needed
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

  - [ ]* 6.8 Write property tests for SubscriptionService
    - **Property 19: Subscription status transitions follow valid state machine**
    - **Validates: Requirements 14.3, 14.7**

  - [x] 6.9 Implement PermissionService
    - Create `src/services/platform/permission.Service.ts`
    - Implement `list()` — all permissions
    - Implement `create(data)` — create permission, check code uniqueness (409 on conflict)
    - Implement `update(id, data)` — update fields
    - Implement `delete(id)` — check for StoreRolePermission usage (409 if in use), then hard delete
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

  - [ ]* 6.10 Write property tests for PermissionService
    - **Property 21: Unique code constraint on permissions**
    - **Property 22: Cannot delete permission in use**
    - **Validates: Requirements 15.5, 15.7**

  - [x] 6.11 Implement DashboardService
    - Create `src/services/platform/dashboard.Service.ts`
    - Implement `getStats()` — count users, stores, active stores, subscriptions
    - Implement `getRevenue()` — aggregate monthly revenue from active/trialing subscriptions (price_monthly for MONTHLY, price_yearly/12 for YEARLY)
    - Implement `getGrowth(startMonth, endMonth)` — group store creation by month, default last 12 months
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 6.12 Write property tests for DashboardService
    - **Property 23: Dashboard revenue calculation correctness**
    - **Property 24: Dashboard growth metrics group stores by month**
    - **Validates: Requirements 16.2, 16.3, 16.5**

- [x] 7. Checkpoint - Ensure all platform services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Platform controllers and routes
  - [x] 8.1 Implement PlatformUserController
    - Create `src/controllers/platform/platformUser.Controller.ts`
    - Implement list, getById, update, delete handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7_

  - [x] 8.2 Implement PlatformStoreController
    - Create `src/controllers/platform/platformStore.Controller.ts`
    - Implement list, getById, updateStatus, delete handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

  - [x] 8.3 Implement PlanController
    - Create `src/controllers/platform/plan.Controller.ts`
    - Implement list, create, getById, update, delete handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 8.4 Implement SubscriptionController
    - Create `src/controllers/platform/subscription.Controller.ts`
    - Implement list, getById, update handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 8.5 Implement PermissionController
    - Create `src/controllers/platform/permission.Controller.ts`
    - Implement list, create, update, delete handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 8.6 Implement DashboardController
    - Create `src/controllers/platform/dashboard.Controller.ts`
    - Implement getStats, getRevenue, getGrowth handlers
    - Wrap all handlers with asyncHandler
    - _Requirements: 16.1, 16.2, 16.3_

  - [x] 8.7 Create platform routes
    - Create `src/routes/platform.routes.ts`
    - Wire all platform endpoints with [verifyToken, platformGuard, ...] middleware chain
    - Include validateBody, validateQuery, validateParams as appropriate per endpoint
    - _Requirements: 10.1, 10.3, 11.1, 12.1, 13.1, 14.1, 15.1, 16.1_

- [x] 9. Store creation service
  - [x] 9.1 Implement StoreCreationService
    - Create `src/services/storeCreation.Service.ts`
    - Implement `createStore(userId, data)` — use Prisma transaction to:
      1. Check domain uniqueness (409 on conflict)
      2. Create Store with status=DRAFT, currency_code=LYD, locale=ar-LY, timezone=Africa/Tripoli
      3. Create 6 default StoreRole records (Owner, Admin, Catalog Manager, Order Manager, Inventory Manager, Staff) with is_protected=true
      4. Create StoreMembership linking user to store with Owner role and ACTIVE status
    - Return created store with membership and role data
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6_

  - [ ]* 9.2 Write property tests for StoreCreationService
    - **Property 26: Store creation initializes defaults and relationships**
    - **Property 27: Store domain uniqueness**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.4, 18.5**

- [x] 10. Wire routes and final integration
  - [x] 10.1 Update route aggregator
    - Update `src/routes/index.ts` to import and mount auth routes at `/api/auth` and platform routes at `/api/platform`
    - Remove placeholder empty routers for auth and platform
    - Ensure 404 catch-all remains at the bottom
    - _Requirements: 1.5, 10.1, 18.1_

  - [ ]* 10.2 Write integration tests for auth flow
    - Test full registration → login → refresh → logout flow
    - Test forgot-password → reset-password flow
    - Test profile get/update and change-password
    - Test store creation from authenticated user
    - **Validates: Requirements 1.1-1.7, 2.1-2.6, 3.1-3.3, 4.1-4.5, 5.1-5.4, 6.1-6.4, 7.1-7.4, 8.1-8.5, 9.1-9.5, 18.1-18.6**

  - [ ]* 10.3 Write integration tests for platform endpoints
    - Test platform user CRUD with role enforcement
    - Test platform store management with status transitions
    - Test plan and subscription management
    - Test permission management with in-use protection
    - Test dashboard statistics and revenue calculation
    - **Validates: Requirements 10.1-10.4, 11.1-11.7, 12.1-12.7, 13.1-13.8, 14.1-14.7, 15.1-15.7, 16.1-16.5**

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Phase 0 infrastructure (BaseService, errorHandler, validateBody/Query/Params, asyncHandler, sendSuccess/sendError) is assumed complete and available
- The existing `verifyToken` middleware will be updated in-place rather than replaced
- All services use the existing Prisma client from `src/configs/prisma.ts`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["2.1", "3.3"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 4, "tasks": ["2.4", "2.5", "3.2"] },
    { "id": 5, "tasks": ["5.1", "5.2", "5.3", "9.1"] },
    { "id": 6, "tasks": ["5.4", "9.2", "6.1", "6.3", "6.5", "6.7", "6.9", "6.11"] },
    { "id": 7, "tasks": ["6.2", "6.4", "6.6", "6.8", "6.10", "6.12"] },
    { "id": 8, "tasks": ["8.1", "8.2", "8.3", "8.4", "8.5", "8.6"] },
    { "id": 9, "tasks": ["8.7"] },
    { "id": 10, "tasks": ["10.1"] },
    { "id": 11, "tasks": ["10.2", "10.3"] }
  ]
}
```
