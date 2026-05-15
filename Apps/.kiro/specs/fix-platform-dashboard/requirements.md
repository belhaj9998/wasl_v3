# Requirements Document

## Introduction

This document specifies the requirements for fixing critical bugs in the Platform Owner Dashboard of the Wasl SaaS application. The dashboard is currently non-functional due to API endpoint mismatches, response structure mismatches, missing error handling in Redux state, missing auth guards, and HTTP method mismatches on update operations.

## Glossary

- **Platform_Dashboard**: The admin dashboard page at `/platform/dashboard` that displays platform-wide statistics
- **API_Client**: The centralized HTTP client (`apiClient`) that handles all frontend-to-backend communication
- **Platform_Slice**: The Redux Toolkit slice managing platform admin state (users, stores, plans, subscriptions, stats)
- **Platform_Service**: The frontend service layer that constructs API calls for platform admin operations
- **Platform_Routes**: The Express.js router defining backend endpoints under `/api/platform/`
- **Auth_Guard**: A frontend mechanism that verifies user authentication and role before rendering protected pages

## Requirements

### Requirement 1: Stats API Endpoint Alignment

**User Story:** As a platform admin, I want the dashboard stats page to load successfully, so that I can view platform-wide statistics.

#### Acceptance Criteria

1. WHEN the Platform_Dashboard dispatches `fetchPlatformStats`, THE Platform_Service SHALL send a GET request to `/platform/dashboard/stats`
2. WHEN the API_ENDPOINTS constant for STATS is referenced, THE API_Client SHALL use the path `/platform/dashboard/stats` matching the backend route definition
3. WHEN the dashboard revenue endpoint is called, THE Platform_Service SHALL send a GET request to `/platform/dashboard/revenue`
4. WHEN the dashboard growth endpoint is called, THE Platform_Service SHALL send a GET request to `/platform/dashboard/growth`

### Requirement 2: Stats Response Structure Handling

**User Story:** As a platform admin, I want the dashboard to correctly parse the stats API response, so that statistics display accurate values.

#### Acceptance Criteria

1. WHEN the backend returns `{ success: true, data: { stats: {...} } }`, THE `fetchPlatformStats` thunk SHALL extract the nested `stats` object from `response.data.stats`
2. WHEN the stats data is stored in Redux state, THE Platform_Slice SHALL contain a `DashboardStats` object with fields `total_users`, `total_stores`, `total_orders`, `total_revenue`, and `active_subscriptions`

### Requirement 3: Dashboard Redux State Error and Loading Handling

**User Story:** As a platform admin, I want the dashboard to show loading indicators and error messages appropriately, so that I understand the current state of data fetching.

#### Acceptance Criteria

1. WHEN `fetchPlatformStats` is dispatched, THE Platform_Slice SHALL set a loading flag to true and clear any previous error
2. WHEN `fetchPlatformStats` resolves successfully, THE Platform_Slice SHALL set the loading flag to false and store the stats data
3. IF `fetchPlatformStats` is rejected, THEN THE Platform_Slice SHALL set the loading flag to false and store the error message
4. WHILE the stats loading flag is true, THE Platform_Dashboard SHALL display skeleton loading indicators
5. IF the stats error is non-null, THEN THE Platform_Dashboard SHALL display an error message with a retry option

### Requirement 4: Platform Layout Auth Guard

**User Story:** As a platform owner, I want the platform admin area to be protected from unauthorized access, so that only PLATFORM_ADMIN and PLATFORM_OWNER users can view the dashboard.

#### Acceptance Criteria

1. WHEN a user navigates to any route under `(platform)`, THE Auth_Guard SHALL verify the user is authenticated
2. IF the user is not authenticated, THEN THE Auth_Guard SHALL redirect the user to the login page
3. IF the user is authenticated but does not have PLATFORM_ADMIN or PLATFORM_OWNER role, THEN THE Auth_Guard SHALL redirect the user to an unauthorized page or the home page
4. WHILE the auth check is in progress, THE Platform_Layout SHALL display a loading state

### Requirement 5: HTTP Method Alignment for Update Operations

**User Story:** As a platform admin, I want to update users, plans, and subscriptions successfully, so that I can manage platform resources.

#### Acceptance Criteria

1. WHEN `platformService.users.update()` is called, THE Platform_Service SHALL send a PATCH request matching the backend route `PATCH /users/:id`
2. WHEN `platformService.plans.update()` is called, THE Platform_Service SHALL send a PATCH request matching the backend route `PATCH /plans/:id`
3. WHEN `platformService.subscriptions.update()` is called, THE Platform_Service SHALL send a PATCH request matching the backend route `PATCH /subscriptions/:id`
