# Implementation Plan: Testing & QA

## Overview

تأسيس بنية اختبارات شاملة لمشروع Wasl SaaS Server باستخدام Vitest + fast-check + Supertest. يتم البناء بشكل تدريجي: البنية التحتية أولاً، ثم اختبارات الوحدة للأدوات المساعدة، ثم اختبارات الخصائص، ثم اختبارات التكامل.

## Tasks

- [x] 1. Set up test infrastructure and configuration
  - [x] 1.1 Install test dependencies (vitest, @vitest/coverage-v8, supertest, fast-check, vitest-mock-extended, node-mocks-http, @types/supertest)
    - Add to devDependencies in package.json
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Create Vitest configuration file
    - Create `vitest.config.ts` at project root
    - Configure TypeScript path aliases matching tsconfig.json
    - Set up workspace projects: `unit` (threads, parallel) and `integration` (forks, sequential)
    - Configure coverage with v8 provider, lcov + text reporters
    - Set globals: true for describe/it/expect without imports
    - _Requirements: 1.1, 1.2, 1.5, 1.6, 1.7_

  - [x] 1.3 Update package.json scripts
    - Add `test`: `vitest run`
    - Add `test:unit`: `vitest run --project unit`
    - Add `test:int`: `vitest run --project integration`
    - Add `test:coverage`: `vitest run --coverage`
    - Add `test:watch`: `vitest`
    - _Requirements: 1.8_

  - [x] 1.4 Create global setup for test database
    - Create `src/__tests__/setup/globalSetup.ts`
    - Set DATABASE_URL to test database (append `_test` to DB name or use separate env)
    - Run `prisma migrate deploy` programmatically
    - Export teardown function
    - _Requirements: 1.3_

  - [x] 1.5 Create test database utilities
    - Create `src/__tests__/setup/testDatabase.ts`
    - Implement `resetDatabase()` using TRUNCATE CASCADE on all tables
    - Implement `resetTables(tables: string[])` for selective cleanup
    - Implement `disconnect()` for Prisma client cleanup
    - _Requirements: 1.4_

  - [x] 1.6 Create test app instance for Supertest
    - Create `src/__tests__/setup/testApp.ts`
    - Export Express app without calling `listen()`
    - Export Prisma client instance for direct DB access in tests
    - _Requirements: 8.1, 8.2_

- [x] 2. Create test helpers and factories
  - [x] 2.1 Create test data factories
    - Create `src/__tests__/helpers/factories.ts`
    - Implement `UserFactory` with `build()` and `create()` methods
    - Implement `StoreFactory` with `build()` and `create()` methods
    - Implement `CategoryFactory` with `build()`, `create()`, and `createTree()` methods
    - Use sequential counters for unique emails/phones
    - _Requirements: 4.1, 5.1, 6.1_

  - [x] 2.2 Create auth test helpers
    - Create `src/__tests__/helpers/auth.helpers.ts`
    - Implement `createAuthenticatedUser()` — creates user + returns tokens
    - Implement `createStoreAdmin()` — creates user + store + membership + returns token
    - Implement `generateTestToken()` — generates JWT with custom payload
    - _Requirements: 4.1, 4.4, 5.1_

  - [x] 2.3 Create fast-check arbitraries
    - Create `src/__tests__/helpers/arbitrary.ts`
    - Define `arbSlugInput` — arbitrary strings for slug testing
    - Define `arbWhitespace` — whitespace-only strings
    - Define `arbShipmentStatus` — all ShipmentStatus enum values
    - Define `arbRegistrationData` — valid registration objects
    - Define `arbCategoryList` — flat category lists with valid parent references
    - Define `arbStoreId` — integers 1–9999
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.8_

- [x] 3. Checkpoint - Verify infrastructure
  - Ensure test infrastructure compiles and a trivial test passes with `npm run test:unit`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Unit tests for utilities
  - [x] 4.1 Write unit tests for slugify
    - Create `src/__tests__/unit/utils/slugify.test.ts`
    - Test basic slug generation (lowercase, hyphens)
    - Test special character removal
    - Test multiple spaces/hyphens collapse
    - Test leading/trailing whitespace trimming
    - Test empty string input
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.2 Write property tests for slugify
    - Create `src/__tests__/property/slugify.property.test.ts`
    - **Property 1: Slugify Idempotence** — `slugify(slugify(x)) === slugify(x)`
    - **Property 2: Slugify Output Character Set** — output matches `^[a-z0-9-]*$`
    - **Property 3: Slugify Whitespace Produces Empty** — whitespace → `""`
    - Configure minimum 100 iterations per property
    - **Validates: Requirements 2.1, 2.3, 9.1, 9.2, 9.6**

  - [x] 4.3 Write unit tests for orderStateMachine
    - Create `src/__tests__/unit/utils/orderStateMachine.test.ts`
    - Test all valid transitions return true
    - Test invalid transitions return false
    - Test terminal states (CANCELED, RETURNED) have no outgoing transitions
    - Test assertTransition throws AppError 400 for invalid transitions
    - Test getValidTransitions returns new array (immutability)
    - _Requirements: 2.4, 2.5, 2.6, 7.3_

  - [ ]* 4.4 Write property tests for orderStateMachine
    - Create `src/__tests__/property/orderStateMachine.property.test.ts`
    - **Property 4: Transition Correctness** — canTransition matches defined map for all pairs
    - **Property 5: Assert Consistency** — assertTransition throws iff canTransition is false
    - Configure minimum 100 iterations per property
    - **Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6, 9.3, 9.4**

  - [x] 4.5 Write unit tests for AppError
    - Create `src/__tests__/unit/utils/AppError.test.ts`
    - Test each static factory method (badRequest, unauthorized, forbidden, notFound, conflict, unprocessable, tooMany, internal)
    - Verify statusCode, message, and isOperational for each
    - Test default messages when no argument provided
    - Test AppError.internal has isOperational = false
    - _Requirements: 2.9, 10.6, 10.7_

  - [x] 4.6 Write unit tests for asyncHandler
    - Create `src/__tests__/unit/utils/asyncHandler.test.ts`
    - Test that rejected promises call next(error)
    - Test that resolved promises allow response to complete
    - Test that synchronous throws are caught
    - _Requirements: 2.10, 2.11_

  - [x] 4.7 Write unit tests for apiResponse
    - Create `src/__tests__/unit/utils/apiResponse.test.ts`
    - Test sendSuccess sets correct status, Content-Type, and JSON body
    - Test sendError sets correct status and error format
    - Test sendPaginated includes data array and meta object
    - Test default status codes (200 for success, 500 for error)
    - _Requirements: 2.12, 2.13_

  - [x] 4.8 Write unit tests for orderNumberGenerator
    - Create `src/__tests__/unit/utils/orderNumberGenerator.test.ts`
    - Test format matches ORD-XXXX-XXXXXX pattern
    - Test store ID is zero-padded to 4 digits
    - Test sequence starts at 1 when no previous orders
    - Test sequence increments from last order number
    - Mock Prisma transaction client
    - _Requirements: 2.7, 2.8_

  - [ ]* 4.9 Write property tests for orderNumberGenerator
    - Create `src/__tests__/property/orderNumber.property.test.ts`
    - **Property 6: Order Number Format Validity** — output matches `^ORD-\d{4}-\d{6}$`
    - Mock Prisma to return null (first order scenario)
    - Configure minimum 100 iterations
    - **Validates: Requirements 2.7, 9.7**

- [x] 5. Unit tests for validators and middlewares
  - [x] 5.1 Write unit tests for auth validators
    - Create `src/__tests__/unit/validators/auth.validators.test.ts`
    - Test registerSchema with valid data
    - Test registerSchema rejects invalid email, phone, short/long password
    - Test loginSchema rejects empty identifier/password
    - Test forgotPasswordSchema, resetPasswordSchema, changePasswordSchema
    - Test createStoreSchema domain regex validation
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.2 Write property tests for validators
    - Create `src/__tests__/property/validators.property.test.ts`
    - **Property 7: Zod Schema Round-Trip** — valid data parses to equivalent output
    - Generate valid registration data with fast-check
    - Verify parsed output contains all input fields
    - Configure minimum 100 iterations
    - **Validates: Requirements 3.1, 3.7, 9.5**

  - [x] 5.3 Write unit tests for validate middleware
    - Create `src/__tests__/unit/middlewares/validate.test.ts`
    - Test validateBody passes ZodError to next on invalid body
    - Test validateBody replaces req.body with parsed data on valid input
    - Test validateQuery and validateParams similarly
    - Use node-mocks-http for req/res mocking
    - _Requirements: 3.8_

  - [x] 5.4 Write unit tests for error middleware
    - Create `src/__tests__/unit/middlewares/error.test.ts`
    - Test AppError handling (various status codes)
    - Test Prisma P2002 → 409 with field name
    - Test Prisma P2025 → 404
    - Test ZodError → 422 with issues array
    - Test unknown error → 500 generic message
    - Use node-mocks-http for res mocking
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6. Checkpoint - Unit tests pass
  - Run `npm run test:unit` and ensure all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Unit tests for services (with mocked Prisma)
  - [x] 7.1 Write unit tests for CategoryService.buildCategoryTree
    - Create `src/__tests__/unit/services/category.Service.test.ts`
    - Test empty list returns empty array
    - Test single root category
    - Test multi-level tree building (3 levels)
    - Test orphaned children (parent not in list) become roots
    - Test sort_order sorting at each level
    - _Requirements: 6.1, 6.2_

  - [ ]* 7.2 Write property tests for buildCategoryTree
    - Create `src/__tests__/property/categoryTree.property.test.ts`
    - **Property 8: Node Count Invariant** — total nodes in tree equals input list length
    - **Property 9: Sort Order Invariant** — children sorted by sort_order at each level
    - Generate flat category lists with valid parent references
    - Configure minimum 100 iterations
    - **Validates: Requirements 6.1, 6.2, 9.8, 9.9**

  - [x] 7.3 Write unit tests for AuthService (mocked Prisma)
    - Create `src/__tests__/unit/services/auth.Service.test.ts`
    - Test register — email uniqueness check, phone uniqueness check, password hashing
    - Test login — user lookup, password verification, inactive account rejection
    - Test forgotPassword — non-existent email returns without error
    - Test resetPassword — expired token rejection
    - Mock Prisma client using vitest-mock-extended
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.10, 4.12_

- [x] 8. Integration tests for auth flows
  - [x] 8.1 Write integration tests for registration
    - Create `src/__tests__/integration/auth/register.test.ts`
    - Test successful registration returns 201 with user + accessToken + refresh cookie
    - Test duplicate email returns 409
    - Test duplicate phone returns 409
    - Test invalid body returns 422
    - Use Supertest against test app
    - _Requirements: 4.1, 4.2, 4.3, 8.1_

  - [x] 8.2 Write integration tests for login
    - Create `src/__tests__/integration/auth/login.test.ts`
    - Test successful login returns 200 with tokens
    - Test invalid credentials returns 401
    - Test deactivated account returns 403
    - _Requirements: 4.4, 4.5, 4.6, 8.2_

  - [x] 8.3 Write integration tests for token refresh
    - Create `src/__tests__/integration/auth/refresh.test.ts`
    - Test valid refresh token returns new access token
    - Test missing refresh token returns 401
    - Test invalid/expired refresh token returns 401
    - _Requirements: 4.8, 4.9_

  - [x] 8.4 Write integration tests for password flows
    - Create `src/__tests__/integration/auth/password.test.ts`
    - Test forgot password with existing email (verify token stored)
    - Test forgot password with non-existent email (no error)
    - Test reset password with valid token
    - Test reset password with expired token returns 400
    - Test change password with correct current password
    - Test change password with wrong current password returns 401
    - _Requirements: 4.10, 4.11, 4.12, 4.13_

- [x] 9. Integration tests for multi-tenant isolation
  - [x] 9.1 Write integration tests for auth middleware
    - Create `src/__tests__/integration/middleware/auth.test.ts`
    - Test protected endpoint without token returns 401
    - Test protected endpoint with valid token succeeds
    - Test protected endpoint with expired token returns 401
    - Test platformGuard rejects non-platform roles
    - _Requirements: 4.14, 4.15, 8.3_

  - [x] 9.2 Write integration tests for store context middleware
    - Create `src/__tests__/integration/middleware/storeContext.test.ts`
    - Test valid x-store-id with membership attaches context
    - Test x-store-id without membership returns 403
    - Test x-store-id for SUSPENDED store returns 403
    - Test x-store-id for ARCHIVED store returns 403
    - Test INACTIVE membership returns 403
    - Test requirePermission with missing permission returns 403
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.4, 8.5_

  - [x] 9.3 Write integration tests for storefront tenant middleware
    - Create `src/__tests__/integration/storefront/tenant.test.ts`
    - Test valid domain resolves store context
    - Test non-existent domain returns 404
    - Test DRAFT store returns 403
    - Test SUSPENDED store returns 403
    - Test session cookie is set for new visitors
    - _Requirements: 5.6, 5.7, 5.8, 8.6_

- [x] 10. Integration tests for business logic
  - [x] 10.1 Write integration tests for category operations
    - Create `src/__tests__/integration/store-admin/category.test.ts`
    - Test create category with valid data
    - Test create category with depth > 3 returns 400
    - Test create category with non-existent parent returns 404
    - Test update category parent to self returns 400 (circular)
    - Test update category parent to descendant returns 400 (circular)
    - Test delete category reassigns children
    - Test reorder with invalid IDs returns 400
    - Test unique slug generation with suffix
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9_

  - [x] 10.2 Write integration tests for error handler responses
    - Create `src/__tests__/integration/middleware/errorHandler.test.ts`
    - Test AppError responses through actual endpoints
    - Test Prisma P2002 through duplicate creation
    - Test ZodError through invalid request body
    - Test 404 for non-existent routes
    - _Requirements: 8.7, 8.8, 8.9, 8.10_

- [x] 11. Final checkpoint - All tests pass
  - Run `npm test` and ensure all test suites pass
  - Run `npm run test:coverage` and verify coverage meets targets
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (9 properties total)
- Unit tests validate specific examples and edge cases
- Integration tests require the test database to be running
- Priority order: infrastructure → utilities → validators → auth → multi-tenant → business logic
