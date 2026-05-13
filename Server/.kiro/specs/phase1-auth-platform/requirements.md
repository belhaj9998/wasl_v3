# Requirements Document

## Introduction

Phase 1 of Wasl SaaS implements the Authentication system and Platform Administration layer. This phase covers user registration, login/logout with JWT-based dual-token strategy, password management, profile operations, and a full suite of platform-level admin endpoints for managing users, stores, subscription plans, subscriptions, permissions, and dashboard analytics. The system is built on Express + Prisma + PostgreSQL with Zod validation and TypeScript.

## Glossary

- **Auth_Service**: The service responsible for user authentication operations including registration, login, logout, token refresh, and password management.
- **Token_Service**: The service responsible for generating, validating, and revoking JWT access tokens and refresh tokens.
- **Platform_Guard**: The middleware that verifies the authenticated user holds a PLATFORM_ADMIN or PLATFORM_OWNER system_role before granting access to platform endpoints.
- **User**: A registered account in the system identified by email and phone, with a system_role (USER, SUPPORT, PLATFORM_ADMIN, PLATFORM_OWNER).
- **Store**: A tenant workspace created by a User, progressing through statuses DRAFT → ACTIVE → SUSPENDED → ARCHIVED.
- **Subscription_Plan**: A predefined pricing tier (Starter, Growth, Scale) that defines resource limits for stores.
- **Store_Subscription**: The binding between a Store and a Subscription_Plan with billing cycle and status tracking.
- **Permission**: A platform-level permission record defining a module-action pair (e.g., catalog.view).
- **Access_Token**: A short-lived JWT (15 minutes) sent via Authorization header for API authentication.
- **Refresh_Token**: A long-lived JWT (7 days) stored in an httpOnly cookie used to obtain new Access_Tokens.
- **Platform_Dashboard_Service**: The service responsible for aggregating platform-wide statistics, revenue data, and growth metrics.

---

## Prerequisites (Schema Migration)

Before implementing Phase 1, the following Prisma schema changes are required:

1. **User model** — Add `deleted_at DateTime?`, `reset_token String?`, `reset_token_expires_at DateTime?`
2. **Store model** — Add `deleted_at DateTime?`
3. **SubscriptionPlan model** — Add `deleted_at DateTime?`
4. **New RefreshToken model** — Create with fields: `id`, `user_id`, `token` (hashed), `expires_at`, `created_at`

---

## Requirements

### Requirement 1: User Registration

**User Story:** As a new user, I want to register an account with my name, email, phone, and password, so that I can access the Wasl SaaS platform.

#### Acceptance Criteria

1. WHEN a valid registration request is received with name, email, phone, and password, THE Auth_Service SHALL create a new User record with system_role set to USER and is_active set to true.
2. WHEN a registration request is received, THE Auth_Service SHALL hash the password using bcrypt with 12 rounds before storing the User record.
3. WHEN a registration request contains an email that already exists, THE Auth_Service SHALL return a 409 Conflict error with a message indicating the email is already registered.
4. WHEN a registration request contains a phone number that already exists, THE Auth_Service SHALL return a 409 Conflict error with a message indicating the phone number is already registered.
5. WHEN registration succeeds, THE Auth_Service SHALL issue an Access_Token containing the user id and system_role with a 15-minute expiry, and a Refresh_Token with a 7-day expiry, and return the User profile data (id, name, email, phone, avatar_url, system_role, is_active, created_at, updated_at) in the response.
6. WHEN registration succeeds, THE Token_Service SHALL set the Refresh_Token as an httpOnly, secure, sameSite cookie with a 7-day expiry.
7. IF a registration request contains both a duplicate email and a duplicate phone, THEN THE Auth_Service SHALL validate email uniqueness first and return the 409 Conflict error for the email conflict.

### Requirement 2: User Login

**User Story:** As a registered user, I want to log in with my email or phone and password, so that I can access my account.

#### Acceptance Criteria

1. WHEN a login request is received with a valid email and correct password, THE Auth_Service SHALL authenticate the user and return an Access_Token and Refresh_Token.
2. WHEN a login request is received with a valid phone and correct password, THE Auth_Service SHALL authenticate the user and return an Access_Token and Refresh_Token.
3. WHEN a login request is received with credentials that do not match any User record, THE Auth_Service SHALL return a 401 Unauthorized error with the message "Invalid credentials".
4. WHILE a User account has is_active set to false, THE Auth_Service SHALL reject login attempts with a 403 Forbidden error.
5. WHEN login succeeds, THE Auth_Service SHALL update the last_login_at timestamp on the User record.
6. WHEN login succeeds, THE Token_Service SHALL set the Refresh_Token as an httpOnly, secure, sameSite cookie with a 7-day expiry.

### Requirement 3: User Logout

**User Story:** As an authenticated user, I want to log out, so that my session is invalidated and my tokens cannot be reused.

#### Acceptance Criteria

1. WHEN a logout request is received from an authenticated user, THE Auth_Service SHALL clear the Refresh_Token cookie from the response.
2. WHEN a logout request is received, THE Auth_Service SHALL delete the stored Refresh_Token record from the database so it cannot be reused.
3. WHEN a logout request is received, THE Auth_Service SHALL return a 200 success response confirming the logout.

### Requirement 4: Token Refresh

**User Story:** As an authenticated user, I want to refresh my access token using my refresh token, so that I can maintain my session without re-entering credentials.

#### Acceptance Criteria

1. WHEN a refresh request is received with a valid Refresh_Token cookie, THE Token_Service SHALL verify the token signature and expiry using the JWT refresh secret.
2. WHEN the Refresh_Token is valid and exists in the database, THE Token_Service SHALL issue a new Access_Token with a 15-minute expiry.
3. IF the Refresh_Token is expired or has an invalid signature, THEN THE Token_Service SHALL return a 401 Unauthorized error.
4. IF no Refresh_Token cookie is present in the request, THEN THE Token_Service SHALL return a 401 Unauthorized error with the message "No refresh token provided".
5. IF the Refresh_Token is valid but does not exist in the database (revoked), THEN THE Token_Service SHALL return a 401 Unauthorized error.

### Requirement 5: Forgot Password

**User Story:** As a user who forgot my password, I want to request a password reset, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a forgot-password request is received with a registered email, THE Auth_Service SHALL generate a cryptographically secure reset token with a 1-hour expiry.
2. WHEN a forgot-password request is received with an email that does not exist, THE Auth_Service SHALL return a 200 success response without revealing whether the email exists.
3. WHEN a reset token is generated, THE Auth_Service SHALL store the hashed reset token and its expiry timestamp associated with the User record.
4. THE Auth_Service SHALL return a success response containing a message that a reset link has been sent (actual email/SMS delivery is out of scope for this phase).

### Requirement 6: Reset Password

**User Story:** As a user with a valid reset token, I want to set a new password, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a reset-password request is received with a valid, non-expired reset token and a new password, THE Auth_Service SHALL update the User password with the new bcrypt-hashed password.
2. WHEN the password is successfully reset, THE Auth_Service SHALL invalidate the reset token so it cannot be reused.
3. IF the reset token is expired, THEN THE Auth_Service SHALL return a 400 Bad Request error with the message "Reset token has expired".
4. IF the reset token is invalid or does not match any User record, THEN THE Auth_Service SHALL return a 400 Bad Request error with the message "Invalid reset token".

### Requirement 7: Get Current User Profile

**User Story:** As an authenticated user, I want to retrieve my profile information, so that I can view my account details.

#### Acceptance Criteria

1. WHEN an authenticated user requests their profile, THE Auth_Service SHALL return the User record excluding the password field.
2. THE Auth_Service SHALL include the user id, name, email, phone, avatar_url, system_role, is_active, last_login_at, created_at, and updated_at fields in the profile response.
3. IF the Access_Token is missing or invalid, THEN THE Auth_Service SHALL return a 401 Unauthorized error.
4. IF the authenticated user's account has been soft-deleted (deleted_at is set), THEN THE Auth_Service SHALL return a 401 Unauthorized error.

### Requirement 8: Update Current User Profile

**User Story:** As an authenticated user, I want to update my profile information, so that I can keep my account details current.

#### Acceptance Criteria

1. WHEN an authenticated user submits a profile update with valid fields (name, avatar_url), THE Auth_Service SHALL update the corresponding User record and set the updated_at timestamp.
2. IF a profile update request includes protected fields (email, phone, password, system_role, is_active), THEN THE Auth_Service SHALL silently ignore those fields and apply only the permitted fields (name, avatar_url).
3. WHEN the profile is successfully updated, THE Auth_Service SHALL return the updated User profile excluding the password field.
4. IF the name field is provided, THEN THE Auth_Service SHALL validate it is between 2 and 100 characters in length, returning a 422 Unprocessable Entity error if invalid.
5. IF the Access_Token is missing or invalid, THEN THE Auth_Service SHALL return a 401 Unauthorized error.

### Requirement 9: Change Password

**User Story:** As an authenticated user, I want to change my password by providing my current password, so that I can maintain account security.

#### Acceptance Criteria

1. WHEN an authenticated user submits a change-password request with the correct current password and a new password (minimum 8 characters), THE Auth_Service SHALL update the User password with the new bcrypt-hashed password.
2. IF the provided current password does not match the stored password, THEN THE Auth_Service SHALL return a 401 Unauthorized error with the message "Current password is incorrect".
3. IF the new password is fewer than 8 characters, THEN THE Auth_Service SHALL return a 422 Unprocessable Entity error with a field-level validation message.
4. WHEN the password is successfully changed, THE Auth_Service SHALL return a 200 success response confirming the change.
5. IF the Access_Token is missing or invalid, THEN THE Auth_Service SHALL return a 401 Unauthorized error.

### Requirement 10: Platform System Role Guard

**User Story:** As a platform administrator, I want platform endpoints to be restricted to users with PLATFORM_ADMIN or PLATFORM_OWNER roles, so that unauthorized users cannot access administrative functions.

#### Acceptance Criteria

1. THE Platform_Guard SHALL verify that the authenticated user has a system_role of PLATFORM_ADMIN or PLATFORM_OWNER before allowing access to platform endpoints.
2. IF the authenticated user does not have a permitted system_role, THEN THE Platform_Guard SHALL return a 403 Forbidden error with the message "Insufficient system role".
3. THE Platform_Guard SHALL execute after the verifyToken middleware in the middleware chain.
4. IF the Access_Token is missing or invalid, THEN THE Platform_Guard SHALL rely on the verifyToken middleware to return a 401 Unauthorized error before the Platform_Guard executes.

### Requirement 11: Platform User Management

**User Story:** As a platform administrator, I want to list, view, update, and delete users, so that I can manage the platform user base.

#### Acceptance Criteria

1. WHEN a platform admin requests the user list, THE Auth_Service SHALL return a paginated list of User records (excluding password) supporting page and limit parameters with a default page size of 20 and a maximum page size of 100.
2. WHEN a platform admin requests the user list with filter parameters, THE Auth_Service SHALL support filtering by system_role, is_active status, and a search term matching name, email, or phone.
3. WHEN a platform admin requests a specific user by ID, THE Auth_Service SHALL return the full User record excluding the password field.
4. WHEN a platform admin updates a user record, THE Auth_Service SHALL allow changes to is_active and system_role fields and return the updated User record excluding the password field.
5. WHEN a platform admin deletes a user, THE Auth_Service SHALL perform a soft delete by setting the deleted_at timestamp and return a 200 success response.
6. IF the requested user ID does not exist or has been soft-deleted, THEN THE Auth_Service SHALL return a 404 Not Found error.
7. IF a platform admin attempts to delete or deactivate their own account, THEN THE Auth_Service SHALL return a 403 Forbidden error.

### Requirement 12: Platform Store Management

**User Story:** As a platform administrator, I want to list, view, update status, and delete stores, so that I can oversee all tenant stores on the platform.

#### Acceptance Criteria

1. WHEN a platform admin requests the store list, THE Store_Service SHALL return a paginated list of Store records supporting page and limit parameters with a default page size of 20 and a maximum page size of 100.
2. WHEN a platform admin requests the store list with filter parameters, THE Store_Service SHALL support filtering by status and a search term matching store name or domain.
3. WHEN a platform admin requests a specific store by ID, THE Store_Service SHALL return the full Store record including the active subscription plan name and the total membership count.
4. WHEN a platform admin updates a store status, THE Store_Service SHALL only allow valid transitions (DRAFT to ACTIVE, ACTIVE to SUSPENDED, SUSPENDED to ACTIVE, ACTIVE to ARCHIVED, SUSPENDED to ARCHIVED) and return the updated Store record.
5. IF a platform admin attempts an invalid store status transition, THEN THE Store_Service SHALL return a 400 Bad Request error indicating the transition is not allowed.
6. WHEN a platform admin deletes a store, THE Store_Service SHALL perform a soft delete by setting the deleted_at timestamp and return a 200 success response.
7. IF the requested store ID does not exist or has been soft-deleted, THEN THE Store_Service SHALL return a 404 Not Found error.

### Requirement 13: Subscription Plan Management

**User Story:** As a platform administrator, I want to create, list, view, update, and delete subscription plans, so that I can define pricing tiers for stores.

#### Acceptance Criteria

1. WHEN a platform admin requests the plan list, THE Platform_Guard SHALL verify authorization and the Plan_Service SHALL return a list of all Subscription_Plan records excluding soft-deleted records.
2. WHEN a platform admin creates a new plan with code (1-50 characters, alphanumeric and hyphens), name (1-100 characters), price_monthly (0.01 to 999,999.99), price_yearly (optional, 0.01 to 9,999,999.99), max_stores (optional, 1 to 10,000), max_products (optional, 1 to 1,000,000), and max_staff (optional, 1 to 10,000), THE Plan_Service SHALL create the Subscription_Plan record and return it.
3. WHEN a platform admin requests a specific plan by ID, THE Plan_Service SHALL return the full Subscription_Plan record.
4. WHEN a platform admin updates a plan, THE Plan_Service SHALL apply the changes to the allowed fields (name, price_monthly, price_yearly, max_stores, max_products, max_staff) and return the updated Subscription_Plan record.
5. WHEN a platform admin deletes a plan, THE Plan_Service SHALL perform a soft delete by setting the deleted_at timestamp.
6. IF a plan with the same code already exists, THEN THE Plan_Service SHALL return a 409 Conflict error.
7. IF the requested plan ID does not exist, THEN THE Plan_Service SHALL return a 404 Not Found error.
8. IF a platform admin attempts to delete a plan that has active Store_Subscription records, THEN THE Plan_Service SHALL return a 409 Conflict error indicating the plan is in use.

### Requirement 14: Subscription Management

**User Story:** As a platform administrator, I want to list and manage store subscriptions, so that I can monitor and adjust billing relationships.

#### Acceptance Criteria

1. WHEN a platform admin requests the subscription list, THE Platform_Guard SHALL verify authorization and the Subscription_Service SHALL return a paginated list of Store_Subscription records (default 20 per page, maximum 100 per page) with related store and plan data.
2. WHEN a platform admin requests a specific subscription by ID, THE Subscription_Service SHALL return the full Store_Subscription record with related store and plan details.
3. WHEN a platform admin updates a subscription status, THE Subscription_Service SHALL only allow valid transitions (TRIALING→ACTIVE, TRIALING→CANCELED, ACTIVE→PAST_DUE, ACTIVE→CANCELED, PAST_DUE→ACTIVE, PAST_DUE→EXPIRED, CANCELED→ACTIVE) and return the updated Store_Subscription record.
4. WHEN a platform admin extends a subscription period, THE Subscription_Service SHALL update the current_period_ends_at to the new date and return the updated Store_Subscription record.
5. WHEN a platform admin changes a subscription plan, THE Subscription_Service SHALL update the plan_id reference and return the updated Store_Subscription record.
6. IF the requested subscription ID does not exist, THEN THE Subscription_Service SHALL return a 404 Not Found error.
7. IF a platform admin attempts an invalid status transition, THEN THE Subscription_Service SHALL return a 422 Unprocessable Entity error indicating the transition is not allowed.

### Requirement 15: Permission Management

**User Story:** As a platform administrator, I want to create, list, update, and delete permissions, so that I can define the access control vocabulary for store roles.

#### Acceptance Criteria

1. WHEN a platform admin requests the permission list, THE Platform_Guard SHALL verify authorization and the Permission_Service SHALL return a list of all Permission records.
2. WHEN a platform admin creates a new permission with code (1-100 characters), module (1-50 characters), action (1-50 characters), and description (optional, maximum 255 characters), THE Permission_Service SHALL create the Permission record and return it.
3. WHEN a platform admin updates a permission, THE Permission_Service SHALL apply the changes and return the updated Permission record.
4. WHEN a platform admin deletes a permission that is not assigned to any StoreRolePermission records, THE Permission_Service SHALL remove the Permission record.
5. IF a permission with the same code already exists, THEN THE Permission_Service SHALL return a 409 Conflict error.
6. IF the requested permission ID does not exist, THEN THE Permission_Service SHALL return a 404 Not Found error.
7. IF a platform admin attempts to delete a permission that is currently assigned to one or more store roles, THEN THE Permission_Service SHALL return a 409 Conflict error indicating the permission is in use.

### Requirement 16: Platform Dashboard Statistics

**User Story:** As a platform administrator, I want to view platform-wide statistics, revenue data, and store growth metrics, so that I can monitor platform health and business performance.

#### Acceptance Criteria

1. WHEN a platform admin requests dashboard statistics, THE Platform_Dashboard_Service SHALL return total user count, total store count, active store count (status = ACTIVE), and total subscription count.
2. WHEN a platform admin requests revenue data, THE Platform_Dashboard_Service SHALL return aggregated monthly revenue calculated from Store_Subscription records with status ACTIVE or TRIALING, using the associated Subscription_Plan price_monthly for MONTHLY billing cycles and price_yearly divided by 12 for YEARLY billing cycles.
3. WHEN a platform admin requests store growth metrics with a start month and end month (maximum range of 24 months), THE Platform_Dashboard_Service SHALL return store creation counts grouped by month for the specified period.
4. IF a platform admin requests store growth metrics without specifying a time period, THEN THE Platform_Dashboard_Service SHALL default to the last 12 months from the current date.
5. THE Platform_Dashboard_Service SHALL calculate revenue based on Subscription_Plan prices and active Store_Subscription billing cycles.

### Requirement 17: Input Validation

**User Story:** As the system, I want all incoming request data to be validated against Zod schemas, so that only well-formed data reaches the service layer.

#### Acceptance Criteria

1. THE Auth_Service SHALL validate registration requests using a Zod schema requiring name (2-100 characters), email (valid email format per RFC 5322), phone (valid international format, 7-15 digits with optional + prefix), and password (minimum 8 characters, maximum 128 characters).
2. THE Auth_Service SHALL validate login requests using a Zod schema requiring identifier (valid email format or valid phone format) and password (1-128 characters).
3. THE Auth_Service SHALL validate forgot-password requests using a Zod schema requiring a valid email format.
4. THE Auth_Service SHALL validate reset-password requests using a Zod schema requiring token (non-empty string) and new password (minimum 8 characters, maximum 128 characters).
5. THE Auth_Service SHALL validate change-password requests using a Zod schema requiring current_password (1-128 characters) and new_password (minimum 8 characters, maximum 128 characters).
6. THE Auth_Service SHALL validate profile update requests using a Zod schema allowing optional name (2-100 characters) and optional avatar_url (valid URL format, maximum 2048 characters).
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with a JSON response containing an array of field-level errors, each specifying the field path and the validation failure reason.

### Requirement 18: Store Creation Flow

**User Story:** As a registered user, I want to create a store, so that I can start my e-commerce business on the platform.

#### Acceptance Criteria

1. WHEN an authenticated user submits a store creation request with name (2-100 characters) and domain (3-63 characters, lowercase alphanumeric and hyphens, must start and end with alphanumeric), THE Store_Service SHALL create a Store record with status set to DRAFT.
2. WHEN a store is created, THE Store_Service SHALL auto-create default StoreRole records (Owner, Admin, Catalog Manager, Order Manager, Inventory Manager, Staff) with their predefined permissions.
3. WHEN a store is created, THE Store_Service SHALL create a StoreMembership record linking the creating User to the store with the Owner role and ACTIVE status.
4. IF a store with the same domain already exists, THEN THE Store_Service SHALL return a 409 Conflict error.
5. WHEN a store is created, THE Store_Service SHALL set default values for currency_code (LYD), locale (ar-LY), and timezone (Africa/Tripoli).
6. WHEN store creation succeeds, THE Store_Service SHALL return the created Store record with its associated membership and role data.
