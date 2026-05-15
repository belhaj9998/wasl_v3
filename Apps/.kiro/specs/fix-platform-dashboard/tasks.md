# Implementation Plan: Fix Platform Dashboard

## Overview

This plan fixes five critical bugs in the Platform Owner Dashboard through targeted changes to API constants, service methods, Redux state management, auth guards, and HTTP methods. Each task is self-contained and builds incrementally toward a fully functional dashboard.

## Tasks

- [x] 1. Fix API endpoint constants and platform service URLs
  - [x] 1.1 Update `Apps/src/lib/constants/api.ts` — replace `STATS: "/platform/stats"` with a `DASHBOARD` object containing `STATS: "/platform/dashboard/stats"`, `REVENUE: "/platform/dashboard/revenue"`, `GROWTH: "/platform/dashboard/growth"`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [x] 1.2 Update `Apps/src/lib/api/services/platform.service.ts` — change `dashboard.getStats()` to use `API_ENDPOINTS.PLATFORM.DASHBOARD.STATS`, `dashboard.getRevenue()` to use `API_ENDPOINTS.PLATFORM.DASHBOARD.REVENUE`, and `dashboard.getGrowth()` to use `API_ENDPOINTS.PLATFORM.DASHBOARD.GROWTH`. Also update the generic type for `getStats` to `ApiResponse<{ stats: DashboardStats }>`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

- [x] 2. Fix stats response parsing and Redux state management
  - [x] 2.1 Update `Apps/src/lib/store/slices/platform.thunks.ts` — change `fetchPlatformStats` to return `response.data.stats` instead of `response.data`
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Update `Apps/src/lib/store/slices/platform.slice.ts` — add `statsLoading: boolean` and `statsError: string | null` to `PlatformState` interface and `initialState`. Add `pending` and `rejected` cases for `fetchPlatformStats` in `extraReducers`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 2.3 Update `Apps/src/app/(platform)/platform/dashboard/page.tsx` — replace `const loading = !stats` with selectors for `state.platform.statsLoading` and `state.platform.statsError`. Add error UI with retry button when `statsError` is non-null
    - _Requirements: 3.4, 3.5_

- [x] 3. Checkpoint - Verify dashboard stats load correctly
  - Ensure the dashboard page fetches stats from the correct endpoint, parses the response correctly, and displays loading/error states. Ask the user if questions arise.

- [x] 4. Add auth guard to platform layout
  - [x] 4.1 Update `Apps/src/app/(platform)/layout.tsx` — add auth and role verification logic at the top of the component. Import `useRouter` from `next/navigation` and `SystemRole` from types. If user is not authenticated, redirect to `/login`. If user role is not `PLATFORM_ADMIN` or `PLATFORM_OWNER`, redirect to `/`. Show a loading state while auth is being determined.
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Fix HTTP method mismatches for update operations
  - [x] 5.1 Update `Apps/src/lib/api/services/platform.service.ts` — change `users.update()` method from `"PUT"` to `"PATCH"`, change `plans.update()` method from `"PUT"` to `"PATCH"`, change `subscriptions.update()` method from `"PUT"` to `"PATCH"`
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 6. Final checkpoint - Verify all fixes
  - Ensure all changes compile without TypeScript errors. Verify: (1) stats endpoint returns data, (2) loading/error states work, (3) auth guard redirects unauthorized users, (4) update operations use PATCH. Ask the user if questions arise.

## Notes

- All fixes are in the frontend (`Apps/`) — no backend changes required
- The backend routes and controllers are already correct
- Task 1 and Task 5 both modify `platform.service.ts` — they can be done together in a single edit
- The auth guard (Task 4) depends on the existing Redux auth state (`state.auth.user` and `state.auth.loading`)
