# Implementation Plan: Phase 2 — Store Setup, Members & Roles

## Overview

This plan implements the Store Administration layer for Wasl SaaS, enabling store owners and authorized members to manage store settings, team members, and roles with granular permissions. It builds on Phase 1 infrastructure (auth, platform admin, token service, store creation) and follows the controller → service → Prisma pattern. Tasks are ordered for incremental progress: utilities/validators first, then services, then controllers, then routes, then wiring.

## Tasks

- [ ] 1. Utilities and validation schemas
  - [ ] 1.1 Create slugify utility
    - Create `src/utils/slugify.ts`
    - Implement `slugify(name: string): string` — converts to lowercase, trims, removes special characters, replaces spaces with hyphens, collapses multiple hyphens, trims leading/trailing hyphens
    - Only characters matching `[a-z0-9-]` should remain in the output
    - _Requirements: 13.3, 15.1_

  - [ ] 1.2 Create Zod validation schemas for store admin endpoints
    - Create `src/validators/storeAdmin.validators.ts`
    - Implement `updateGeneralSchema` — optional name (2-100), currency_code (3 uppercase letters regex), locale (BCP 47 format regex), timezone (max 50)
    - Implement `updateBrandingSchema` — optional nullable logo (URL, max 2048), favicon (URL, max 2048), description (max 1000)
    - Implement `updateSeoSchema` — optional nullable meta_title (max 70), meta_description (max 160)
    - Implement `updateContactSchema` — optional nullable support_email (email), support_phone (regex `^\+?\d{7,15}$`), facebook_url (URL, max 2048), instagram_url (URL, max 2048), tiktok_url (URL, max 2048)
    - Implement `inviteMemberSchema` — required email (email format), role_id (positive integer)
    - Implement `updateMemberRoleSchema` — required role_id (positive integer)
    - Implement `createRoleSchema` — required name (2-50), optional description (max 255)
    - Implement `updateRoleSchema` — optional name (2-50), optional nullable description (max 255)
    - Implement `updateRolePermissionsSchema` — required permission_ids (array of positive integers, 0-200 items)
    - Implement `memberIdParamSchema` — coerced storeId and memberId (positive integers)
    - Implement `roleIdParamSchema` — coerced storeId and roleId (positive integers)
    - Implement `memberListQuerySchema` — page (default 1), limit (1-100, default 20), optional status (MembershipStatus enum), optional search
    - _Requirements: 2.2, 3.2, 4.2, 5.2, 7.2, 9.2, 13.2, 15.2, 17.2, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [ ]* 1.3 Write property tests for slugify utility
    - **Property 11: Slug generation correctness**
    - Test with random Unicode strings, special characters, spaces, leading/trailing hyphens
    - Assert output is lowercase, matches `[a-z0-9-]`, no leading/trailing hyphens, no consecutive hyphens
    - **Validates: Requirements 13.3, 15.1**

  - [ ]* 1.4 Write property tests for Zod validation schemas
    - **Property 2: Zod schema validation correctness**
    - Test each schema with random valid and invalid inputs at boundary lengths
    - Assert valid inputs are accepted and invalid inputs are rejected with field-level errors
    - **Validates: Requirements 2.2, 3.2, 4.2, 5.2, 7.2, 13.2, 15.2, 17.2, 19.1–19.7**

- [ ] 2. Checkpoint - Ensure utilities and validators compile
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Store Settings Service
  - [ ] 3.1 Implement StoreSettingsService
    - Create `src/services/store-admin/storeSettings.Service.ts`
    - Implement `getSettings(storeId)` — fetch full Store record by ID, throw 404 if not found
    - Implement `updateGeneral(storeId, data)` — partial update of name, currency_code, locale, timezone; return updated Store
    - Implement `updateBranding(storeId, data)` — partial update of logo, favicon, description; return updated Store
    - Implement `updateSeo(storeId, data)` — partial update of meta_title, meta_description; return updated Store
    - Implement `updateContact(storeId, data)` — partial update of support_email, support_phone, facebook_url, instagram_url, tiktok_url; return updated Store
    - Each update method verifies store existence before updating (404 if not found)
    - Export singleton instance `storeSettingsService`
    - _Requirements: 1.1, 2.1, 2.5, 3.1, 4.1, 5.1_

  - [ ]* 3.2 Write property tests for StoreSettingsService
    - **Property 1: Partial update preserves unchanged fields**
    - Generate random subsets of valid field values, apply update, verify unchanged fields remain the same and changed fields reflect new values
    - **Validates: Requirements 2.1, 3.1, 4.1, 5.1**

- [ ] 4. Store Member Service
  - [ ] 4.1 Implement StoreMemberService
    - Create `src/services/store-admin/storeMember.Service.ts`
    - Implement `list(params)` — paginated query with optional status filter and search (case-insensitive match on user name, email, phone); return data + pagination meta
    - Implement `invite(storeId, data, invitedByUserId)` — look up user by email (404), validate role belongs to store (404), check not already a member (409), create StoreMembership with status=INVITED and invited_by_user_id
    - Implement `getById(storeId, memberId)` — fetch membership with User and StoreRole relations, throw 404 if not found
    - Implement `updateRole(storeId, memberId, roleId)` — check existence (404), check owner protection (403 if role slug "owner" AND invited_by_user_id is null), validate new role belongs to store (404), update role_id
    - Implement `remove(storeId, memberId, actorUserId)` — check existence (404), self-removal check (403), owner protection (403), delete membership
    - Implement `resendInvitation(storeId, memberId)` — check existence (404), check status is INVITED (400), return success
    - Export singleton instance `storeMemberService`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.3, 7.4, 7.5, 7.7, 8.1, 8.2, 9.1, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.6, 11.1, 11.2, 11.3_

  - [ ]* 4.2 Write property tests for StoreMemberService — pagination
    - **Property 3: Pagination metadata consistency**
    - Generate random total counts and page/limit params, verify totalPages == ceil(total / limit), data.length <= limit
    - **Validates: Requirements 6.1, 6.4**

  - [ ]* 4.3 Write property tests for StoreMemberService — filters
    - **Property 4: Status filter correctness**
    - Generate random member sets with mixed statuses, apply filter, verify all returned records match the filter
    - **Property 5: Search filter correctness**
    - Generate random member data and search substrings, verify all returned records contain the search term in name, email, or phone
    - **Validates: Requirements 6.2, 6.3**

  - [ ]* 4.4 Write property tests for StoreMemberService — invitation and protection
    - **Property 6: Invitation creates correct membership**
    - Verify status=INVITED, correct role_id, correct invited_by_user_id
    - **Property 7: Owner role immutability**
    - Verify any role update targeting the original owner is rejected with 403
    - **Property 8: Owner removal protection**
    - Verify any removal targeting the original owner is rejected with 403
    - **Property 9: Self-removal prevention**
    - Verify any user attempting to remove their own membership is rejected with 403
    - **Property 10: Resend restricted to INVITED status**
    - Verify resend is rejected with 400 for non-INVITED statuses
    - **Validates: Requirements 7.1, 9.4, 10.2, 10.3, 11.2**

- [ ] 5. Store Role Service
  - [ ] 5.1 Implement StoreRoleService
    - Create `src/services/store-admin/storeRole.Service.ts`
    - Implement `list(storeId)` — fetch all roles with `_count.memberships`, ordered by created_at asc
    - Implement `create(storeId, data)` — generate slug from name using slugify, check slug uniqueness within store (409), create StoreRole with is_protected=false
    - Implement `getById(storeId, roleId)` — fetch role with permissions and member count, throw 404 if not found
    - Implement `update(storeId, roleId, data)` — check existence (404), check is_protected (403), regenerate slug if name changed, check slug uniqueness (409), update fields
    - Implement `remove(storeId, roleId)` — check existence (404), check is_protected (403), check has members (409), delete role
    - Implement `updatePermissions(storeId, roleId, permissionIds)` — check role existence (404), validate all permission IDs exist (400), delete existing + create new in transaction, return role with updated permissions
    - Export singleton instance `storeRoleService`
    - _Requirements: 12.1, 12.2, 13.1, 13.3, 13.4, 14.1, 14.2, 15.1, 15.3, 15.4, 15.5, 16.1, 16.2, 16.3, 16.4, 17.1, 17.3, 17.4, 17.5_

  - [ ]* 5.2 Write property tests for StoreRoleService — slug and uniqueness
    - **Property 12: Slug uniqueness enforcement**
    - Generate pairs of role names producing the same slug, verify second create/update is rejected with 409
    - **Validates: Requirements 13.4, 15.4**

  - [ ]* 5.3 Write property tests for StoreRoleService — protection and deletion
    - **Property 13: Protected role immutability**
    - Verify update and delete on is_protected=true roles are rejected with 403
    - **Property 14: Role with members cannot be deleted**
    - Verify delete on roles with assigned members is rejected with 409
    - **Validates: Requirements 15.3, 16.2, 16.3**

  - [ ]* 5.4 Write property tests for StoreRoleService — permissions
    - **Property 15: Permission set replacement is exact**
    - Apply random permission_ids arrays, verify role has exactly those permissions after update; apply same array twice and verify idempotence
    - **Property 16: Role member count accuracy**
    - Verify the member count in list/detail matches actual StoreMembership records for that role
    - **Validates: Requirements 17.1, 12.2**

- [ ] 6. Checkpoint - Ensure all services compile and pass tests
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Controllers
  - [ ] 7.1 Implement StoreSettingsController
    - Create `src/controllers/store-admin/storeSettings.Controller.ts`
    - Implement `getSettings` — extract storeId from req.storeId, call storeSettingsService.getSettings, return with sendSuccess
    - Implement `updateGeneral` — extract storeId and validated body, call storeSettingsService.updateGeneral, return with sendSuccess
    - Implement `updateBranding` — extract storeId and validated body, call storeSettingsService.updateBranding, return with sendSuccess
    - Implement `updateSeo` — extract storeId and validated body, call storeSettingsService.updateSeo, return with sendSuccess
    - Implement `updateContact` — extract storeId and validated body, call storeSettingsService.updateContact, return with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

  - [ ] 7.2 Implement StoreMemberController
    - Create `src/controllers/store-admin/storeMember.Controller.ts`
    - Implement `list` — extract storeId, page, limit, status, search from req; call storeMemberService.list; return with sendPaginated
    - Implement `invite` — extract storeId, email, role_id, invitedByUserId; call storeMemberService.invite; return 201 with sendSuccess
    - Implement `getById` — extract storeId and memberId; call storeMemberService.getById; return with sendSuccess
    - Implement `updateRole` — extract storeId, memberId, role_id; call storeMemberService.updateRole; return with sendSuccess
    - Implement `remove` — extract storeId, memberId, actorUserId; call storeMemberService.remove; return with sendSuccess
    - Implement `resendInvitation` — extract storeId and memberId; call storeMemberService.resendInvitation; return with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 6.1, 7.1, 8.1, 9.1, 10.1, 11.1_

  - [ ] 7.3 Implement StoreRoleController
    - Create `src/controllers/store-admin/storeRole.Controller.ts`
    - Implement `list` — extract storeId; call storeRoleService.list; return with sendSuccess
    - Implement `create` — extract storeId, name, description; call storeRoleService.create; return 201 with sendSuccess
    - Implement `getById` — extract storeId and roleId; call storeRoleService.getById; return with sendSuccess
    - Implement `update` — extract storeId, roleId, body; call storeRoleService.update; return with sendSuccess
    - Implement `remove` — extract storeId and roleId; call storeRoleService.remove; return with sendSuccess
    - Implement `updatePermissions` — extract storeId, roleId, permission_ids; call storeRoleService.updatePermissions; return with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 12.1, 13.1, 14.1, 15.1, 16.1, 17.1_

- [ ] 8. Routes and wiring
  - [ ] 8.1 Create store admin routes
    - Create `src/routes/storeAdmin.routes.ts`
    - Use `Router({ mergeParams: true })` to access :storeId from parent
    - Apply `verifyToken` and `resolveStoreContext` globally via `router.use()`
    - Wire settings routes: GET /settings (store:view), PATCH /settings/general (store:update + validateBody), PATCH /settings/branding (store:update + validateBody), PATCH /settings/seo (store:update + validateBody), PATCH /settings/contact (store:update + validateBody)
    - Wire member routes: GET /members (member:view + validateQuery), POST /members/invite (member:invite + validateBody), GET /members/:memberId (member:view + validateParams), PATCH /members/:memberId/role (member:update + validateParams + validateBody), DELETE /members/:memberId (member:remove + validateParams), POST /members/:memberId/resend-invite (member:invite + validateParams)
    - Wire role routes: GET /roles (role:view), POST /roles (role:create + validateBody), GET /roles/:roleId (role:view + validateParams), PATCH /roles/:roleId (role:update + validateParams + validateBody), DELETE /roles/:roleId (role:delete + validateParams), PUT /roles/:roleId/permissions (role:update + validateParams + validateBody)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [ ] 8.2 Wire store admin routes into main router
    - Update `src/routes/index.ts` to import storeAdminRoutes and mount at `/api/stores/:storeId`
    - Ensure the route is mounted before the 404 catch-all
    - _Requirements: 18.1_

- [ ] 9. Checkpoint - Ensure all routes compile and full middleware chain works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Integration tests
  - [ ]* 10.1 Write integration tests for store settings endpoints
    - Test GET /settings returns full store record
    - Test PATCH /settings/general, /branding, /seo, /contact with valid and invalid payloads
    - Test 403 for missing permissions, 422 for validation failures
    - **Validates: Requirements 1.1–1.4, 2.1–2.5, 3.1–3.4, 4.1–4.4, 5.1–5.4**

  - [ ]* 10.2 Write integration tests for store member endpoints
    - Test full invite → get → update role → remove flow
    - Test owner protection, self-removal prevention, resend invitation
    - Test pagination, status filter, and search
    - Test 403/404/409 error scenarios
    - **Validates: Requirements 6.1–6.5, 7.1–7.7, 8.1–8.3, 9.1–9.6, 10.1–10.6, 11.1–11.4**

  - [ ]* 10.3 Write integration tests for store role endpoints
    - Test full create → get → update → delete flow
    - Test protected role immutability, slug conflict, role with members deletion
    - Test permission assignment and replacement
    - Test 403/404/409 error scenarios
    - **Validates: Requirements 12.1–12.3, 13.1–13.5, 14.1–14.3, 15.1–15.6, 16.1–16.5, 17.1–17.6**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (Properties 1–16)
- Unit tests validate specific examples and edge cases
- Phase 1 infrastructure (verifyToken, resolveStoreContext, requirePermission, asyncHandler, sendSuccess/sendPaginated, AppError, validateBody/Query/Params) is assumed complete and available
- All services use the existing Prisma client from `src/configs/prisma.ts`
- No Prisma schema changes are needed — all models (Store, StoreRole, StoreMembership, StoreRolePermission, Permission) already exist
- The store admin routes use `mergeParams: true` to access `:storeId` from the parent route mount

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "4.4", "5.2", "5.3", "5.4"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3"] },
    { "id": 5, "tasks": ["8.1"] },
    { "id": 6, "tasks": ["8.2"] },
    { "id": 7, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
