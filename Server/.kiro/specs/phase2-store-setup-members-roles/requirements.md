# Requirements Document

## Introduction

Phase 2 of Wasl SaaS implements the Store Administration layer — specifically Store Settings management, Store Member management, and Store Role management. This phase enables store owners and authorized members to configure their store, invite team members, manage roles, and assign granular permissions. All endpoints are scoped to a specific store via the existing `resolveStoreContext` middleware (using the `x-store-id` header) and protected by the `requirePermission` middleware for RBAC enforcement. The system is built on Express + Prisma + PostgreSQL with Zod validation and TypeScript.

## Glossary

- **Store_Settings_Service**: The service responsible for retrieving and updating store configuration including general settings, branding, SEO metadata, and contact information.
- **Store_Member_Service**: The service responsible for listing, inviting, updating, and removing store members (StoreMembership records).
- **Store_Role_Service**: The service responsible for listing, creating, updating, deleting store roles, and managing role-permission assignments.
- **Store**: A tenant workspace with configurable settings including name, domain, currency, locale, timezone, branding (logo, favicon), SEO (meta_title, meta_description), social links, and contact info.
- **StoreMembership**: A record linking a User to a Store with a specific StoreRole and a status (ACTIVE, INVITED, SUSPENDED).
- **StoreRole**: A named role within a store (e.g., Owner, Admin, Staff) that groups a set of permissions. Roles with is_protected=true cannot be deleted or renamed.
- **StoreRolePermission**: A join record linking a StoreRole to a Permission, granting that permission to all members holding the role.
- **Permission**: A platform-level record defining a module:action pair (e.g., store:view, member:invite, role:delete).
- **Resolve_Store_Context**: The existing middleware that extracts store_id from the x-store-id header, validates the user's active membership, checks store status (ACTIVE or DRAFT), and loads the user's permission codes into the request.
- **Require_Permission**: The existing middleware that checks whether the authenticated user's loaded permissions include the required permission code before allowing access to the endpoint.
- **Protected_Role**: A StoreRole with is_protected=true that cannot be deleted or have its name/slug modified. The six default roles (Owner, Admin, Catalog Manager, Order Manager, Inventory Manager, Staff) are protected.
- **Owner_Role**: The StoreRole with slug "owner" assigned to the store creator. The store creator's Owner membership cannot be removed.

---

## Requirements

### Requirement 1: Get Store Settings

**User Story:** As a store admin, I want to retrieve my store's current settings, so that I can view the store configuration.

#### Acceptance Criteria

1. WHEN an authenticated member with store:view permission requests the store settings, THE Store_Settings_Service SHALL return the full Store record including id, name, domain, custom_domain, status, currency_code, locale, timezone, logo, favicon, description, facebook_url, instagram_url, tiktok_url, support_email, support_phone, meta_title, meta_description, created_at, and updated_at.
2. IF the authenticated user does not have the store:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error with the message "You don't have store:view permission".
3. IF the x-store-id header is missing or invalid, THEN THE Resolve_Store_Context middleware SHALL return a 400 Bad Request error.
4. IF the authenticated user is not an active member of the store, THEN THE Resolve_Store_Context middleware SHALL return a 403 Forbidden error.

### Requirement 2: Update Store General Settings

**User Story:** As a store admin, I want to update my store's general settings (name, currency, locale, timezone), so that I can configure the store to match my business needs.

#### Acceptance Criteria

1. WHEN an authenticated member with store:update permission submits a valid update request, THE Store_Settings_Service SHALL update the Store record with the provided fields (name, currency_code, locale, timezone) and return the updated Store record.
2. THE Store_Settings_Service SHALL validate the update request using a Zod schema allowing optional name (2-100 characters), optional currency_code (exactly 3 uppercase letters), optional locale (2-10 characters matching BCP 47 format), and optional timezone (valid IANA timezone string, maximum 50 characters).
3. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.
4. IF the authenticated user does not have the store:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
5. WHEN the update succeeds, THE Store_Settings_Service SHALL set the updated_at timestamp on the Store record.

### Requirement 3: Update Store Branding

**User Story:** As a store admin, I want to update my store's branding (logo, favicon, description), so that I can customize the store's visual identity.

#### Acceptance Criteria

1. WHEN an authenticated member with store:update permission submits a branding update request, THE Store_Settings_Service SHALL update the Store record with the provided fields (logo, favicon, description) and return the updated Store record.
2. THE Store_Settings_Service SHALL validate the branding update request using a Zod schema allowing optional logo (valid URL format, maximum 2048 characters), optional favicon (valid URL format, maximum 2048 characters), and optional description (maximum 1000 characters).
3. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.
4. IF the authenticated user does not have the store:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 4: Update Store SEO Settings

**User Story:** As a store admin, I want to update my store's SEO metadata (meta title, meta description), so that I can improve the store's search engine visibility.

#### Acceptance Criteria

1. WHEN an authenticated member with store:update permission submits an SEO update request, THE Store_Settings_Service SHALL update the Store record with the provided fields (meta_title, meta_description) and return the updated Store record.
2. THE Store_Settings_Service SHALL validate the SEO update request using a Zod schema allowing optional meta_title (maximum 70 characters) and optional meta_description (maximum 160 characters).
3. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.
4. IF the authenticated user does not have the store:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 5: Update Store Contact Information

**User Story:** As a store admin, I want to update my store's contact information and social media links, so that customers can reach me through multiple channels.

#### Acceptance Criteria

1. WHEN an authenticated member with store:update permission submits a contact update request, THE Store_Settings_Service SHALL update the Store record with the provided fields (support_email, support_phone, facebook_url, instagram_url, tiktok_url) and return the updated Store record.
2. THE Store_Settings_Service SHALL validate the contact update request using a Zod schema allowing optional support_email (valid email format), optional support_phone (7-15 digits with optional + prefix), optional facebook_url (valid URL format, maximum 2048 characters), optional instagram_url (valid URL format, maximum 2048 characters), and optional tiktok_url (valid URL format, maximum 2048 characters).
3. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.
4. IF the authenticated user does not have the store:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 6: List Store Members

**User Story:** As a store admin, I want to list all members of my store, so that I can see who has access and their roles.

#### Acceptance Criteria

1. WHEN an authenticated member with member:view permission requests the member list, THE Store_Member_Service SHALL return a paginated list of StoreMembership records with related User data (id, name, email, phone, avatar_url) and StoreRole data (id, name, slug), supporting page and limit parameters with a default page size of 20 and a maximum page size of 100.
2. WHEN a member list request includes a status filter parameter, THE Store_Member_Service SHALL filter results by the specified MembershipStatus (ACTIVE, INVITED, SUSPENDED).
3. WHEN a member list request includes a search parameter, THE Store_Member_Service SHALL filter results by matching the search term against the related User name, email, or phone fields.
4. THE Store_Member_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
5. IF the authenticated user does not have the member:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 7: Invite Store Member

**User Story:** As a store admin, I want to invite a new member to my store by email, so that I can grant them access with a specific role.

#### Acceptance Criteria

1. WHEN an authenticated member with member:invite permission submits an invitation request with a valid email and role_id, THE Store_Member_Service SHALL look up the User by email and create a StoreMembership record with status set to INVITED, the specified role_id, and invited_by_user_id set to the inviting user's ID.
2. THE Store_Member_Service SHALL validate the invitation request using a Zod schema requiring email (valid email format) and role_id (positive integer).
3. IF the specified email does not correspond to a registered User, THEN THE Store_Member_Service SHALL return a 404 Not Found error with the message "User with this email not found".
4. IF the specified role_id does not belong to the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error with the message "Role not found in this store".
5. IF the user is already a member of the store (any status), THEN THE Store_Member_Service SHALL return a 409 Conflict error with the message "User is already a member of this store".
6. IF the authenticated user does not have the member:invite permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN the invitation succeeds, THE Store_Member_Service SHALL return the created StoreMembership record with related User and StoreRole data.

### Requirement 8: Get Store Member Details

**User Story:** As a store admin, I want to view the details of a specific store member, so that I can see their role and membership status.

#### Acceptance Criteria

1. WHEN an authenticated member with member:view permission requests a specific member by membership ID, THE Store_Member_Service SHALL return the StoreMembership record with related User data (id, name, email, phone, avatar_url) and StoreRole data (id, name, slug), including status, invited_by_user_id, joined_at, created_at, and updated_at.
2. IF the specified membership ID does not exist within the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the member:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 9: Update Store Member Role

**User Story:** As a store admin, I want to change a member's role, so that I can adjust their permissions within the store.

#### Acceptance Criteria

1. WHEN an authenticated member with member:update permission submits a role update request with a valid role_id for a specific membership, THE Store_Member_Service SHALL update the StoreMembership role_id and return the updated record including the related User (id, name, email, avatar_url) and StoreRole (id, name, slug) data.
2. THE Store_Member_Service SHALL validate the role update request using a Zod schema requiring role_id (positive integer).
3. IF the specified role_id does not reference a StoreRole belonging to the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error with the message "Role not found in this store".
4. IF the target membership belongs to the store's original owner (identified as the membership with a role slug of "owner" AND invited_by_user_id set to null), THEN THE Store_Member_Service SHALL return a 403 Forbidden error with the message "Cannot change the store owner's role".
5. IF the specified membership ID does not exist within the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error with the message "Member not found".
6. IF the authenticated user does not have the member:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 10: Remove Store Member

**User Story:** As a store admin, I want to remove a member from my store, so that I can revoke their access.

#### Acceptance Criteria

1. WHEN an authenticated member with member:remove permission submits a removal request for a specific membership ID that exists within the current store, THE Store_Member_Service SHALL delete the StoreMembership record regardless of its current status (ACTIVE, INVITED, or SUSPENDED) and return a 200 success response with a confirmation message.
2. IF the target membership has a role with slug "owner" AND has invited_by_user_id set to null (indicating the original store creator), THEN THE Store_Member_Service SHALL return a 403 Forbidden error with the message "Cannot remove the store owner".
3. IF the authenticated user attempts to remove the membership associated with their own user ID, THEN THE Store_Member_Service SHALL return a 403 Forbidden error with the message "Cannot remove yourself from the store".
4. IF the specified membership ID does not exist within the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the member:remove permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. THE Store_Member_Service SHALL evaluate removal checks in the following order: permission verification, membership existence within the store, self-removal check, owner protection check, then deletion.

### Requirement 11: Resend Member Invitation

**User Story:** As a store admin, I want to resend an invitation to a pending member, so that they receive a new notification to join the store.

#### Acceptance Criteria

1. WHEN an authenticated member with member:invite permission submits a resend invitation request for a specific membership with status INVITED, THE Store_Member_Service SHALL return a 200 success response confirming the invitation was resent (actual email delivery is out of scope for this phase).
2. IF the target membership status is not INVITED, THEN THE Store_Member_Service SHALL return a 400 Bad Request error with the message "Can only resend invitation for members with INVITED status".
3. IF the specified membership ID does not exist within the current store, THEN THE Store_Member_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the member:invite permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 12: List Store Roles

**User Story:** As a store admin, I want to list all roles in my store, so that I can see available roles and their configurations.

#### Acceptance Criteria

1. WHEN an authenticated member with role:view permission requests the role list, THE Store_Role_Service SHALL return a list of all StoreRole records for the current store including id, name, slug, description, is_default, is_protected, created_at, and updated_at.
2. THE Store_Role_Service SHALL include the count of members assigned to each role in the response.
3. IF the authenticated user does not have the role:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 13: Create Store Role

**User Story:** As a store admin, I want to create a custom role, so that I can define specific permission sets for different team members.

#### Acceptance Criteria

1. WHEN an authenticated member with role:create permission submits a valid role creation request, THE Store_Role_Service SHALL create a new StoreRole record with is_protected set to false and return the created record.
2. THE Store_Role_Service SHALL validate the creation request using a Zod schema requiring name (2-50 characters) and allowing optional description (maximum 255 characters).
3. THE Store_Role_Service SHALL auto-generate the slug from the name by converting to lowercase, replacing spaces with hyphens, and removing special characters.
4. IF a role with the same slug already exists in the current store, THEN THE Store_Role_Service SHALL return a 409 Conflict error with the message "A role with this name already exists in this store".
5. IF the authenticated user does not have the role:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 14: Get Store Role Details

**User Story:** As a store admin, I want to view the details of a specific role including its permissions, so that I can understand what access it grants.

#### Acceptance Criteria

1. WHEN an authenticated member with role:view permission requests a specific role by ID, THE Store_Role_Service SHALL return the StoreRole record with its associated Permission records (id, code, module, action, description) and the count of members assigned to the role.
2. IF the specified role ID does not exist within the current store, THEN THE Store_Role_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the role:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 15: Update Store Role

**User Story:** As a store admin, I want to update a custom role's name and description, so that I can keep role definitions accurate.

#### Acceptance Criteria

1. WHEN an authenticated member with role:update permission submits a valid update request for a non-protected role, THE Store_Role_Service SHALL update the StoreRole record with the provided fields (name, description) and regenerate the slug from the new name, then return the updated record.
2. THE Store_Role_Service SHALL validate the update request using a Zod schema allowing optional name (2-50 characters) and optional description (maximum 255 characters).
3. IF the target role has is_protected set to true, THEN THE Store_Role_Service SHALL return a 403 Forbidden error with the message "Cannot modify a protected role".
4. IF the new slug conflicts with an existing role in the same store, THEN THE Store_Role_Service SHALL return a 409 Conflict error with the message "A role with this name already exists in this store".
5. IF the specified role ID does not exist within the current store, THEN THE Store_Role_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the role:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 16: Delete Store Role

**User Story:** As a store admin, I want to delete a custom role that is no longer needed, so that I can keep the role list clean.

#### Acceptance Criteria

1. WHEN an authenticated member with role:delete permission submits a deletion request for a non-protected role, THE Store_Role_Service SHALL delete the StoreRole record and return a 200 success response.
2. IF the target role has is_protected set to true, THEN THE Store_Role_Service SHALL return a 403 Forbidden error with the message "Cannot delete a protected role".
3. IF the target role has active members assigned to it (StoreMembership records exist), THEN THE Store_Role_Service SHALL return a 409 Conflict error with the message "Cannot delete a role that has members assigned to it".
4. IF the specified role ID does not exist within the current store, THEN THE Store_Role_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the role:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 17: Update Role Permissions

**User Story:** As a store admin, I want to assign or remove permissions from a role, so that I can fine-tune what actions members with that role can perform.

#### Acceptance Criteria

1. WHEN an authenticated member with role:update permission submits a permission update request with an array of permission_ids, THE Store_Role_Service SHALL replace all existing StoreRolePermission records for the target role with the new set of permission_ids.
2. THE Store_Role_Service SHALL validate the permission update request using a Zod schema requiring permission_ids (array of positive integers, minimum 0 items, maximum 200 items).
3. IF any permission_id in the array does not correspond to a valid Permission record, THEN THE Store_Role_Service SHALL return a 400 Bad Request error with the message "One or more permission IDs are invalid".
4. IF the specified role ID does not exist within the current store, THEN THE Store_Role_Service SHALL return a 404 Not Found error.
5. WHEN the permission update succeeds, THE Store_Role_Service SHALL return the updated StoreRole record with its new list of associated Permission records.
6. IF the authenticated user does not have the role:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 18: Store Admin Route Protection

**User Story:** As the system, I want all store-admin endpoints to enforce authentication, store context resolution, and permission checks, so that only authorized members can perform store operations.

#### Acceptance Criteria

1. THE store-admin route layer SHALL apply the verifyToken middleware first, followed by resolveStoreContext, followed by the appropriate requirePermission middleware for each endpoint.
2. IF the Access_Token is missing or invalid, THEN THE verifyToken middleware SHALL return a 401 Unauthorized error before any store context resolution occurs.
3. WHILE the store status is SUSPENDED or ARCHIVED, THE Resolve_Store_Context middleware SHALL return a 403 Forbidden error indicating the store is not accessible.
4. WHILE a member's status is not ACTIVE, THE Resolve_Store_Context middleware SHALL return a 403 Forbidden error indicating the membership is not active.
5. THE store-admin endpoints SHALL use the x-store-id request header to identify the target store context.

### Requirement 19: Input Validation for Store Admin Endpoints

**User Story:** As the system, I want all store-admin request data to be validated against Zod schemas, so that only well-formed data reaches the service layer.

#### Acceptance Criteria

1. THE Store_Settings_Service SHALL validate all update requests against their respective Zod schemas before processing, returning a 422 Unprocessable Entity error with field-level details on validation failure.
2. THE Store_Member_Service SHALL validate invitation requests requiring email (valid email format per RFC 5322) and role_id (positive integer).
3. THE Store_Member_Service SHALL validate role update requests requiring role_id (positive integer).
4. THE Store_Role_Service SHALL validate role creation requests requiring name (2-50 characters) and allowing optional description (maximum 255 characters).
5. THE Store_Role_Service SHALL validate role update requests allowing optional name (2-50 characters) and optional description (maximum 255 characters).
6. THE Store_Role_Service SHALL validate permission update requests requiring permission_ids (array of positive integers).
7. WHEN validation fails on any store-admin endpoint, THE validation middleware SHALL return a 422 Unprocessable Entity error with a JSON response containing an array of field-level errors, each specifying the field path and the validation failure reason.
