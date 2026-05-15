# Requirements Document

## Introduction

Wasl SaaS Frontend is a multi-tenant e-commerce platform frontend serving three distinct interfaces: Platform Admin Dashboard for platform owner management, Store Admin Dashboard for merchant control, and Storefront for customer-facing shopping. Built with Next.js 15 App Router, it communicates with an Express 5 backend via RESTful APIs, implementing dual JWT authentication, role-based access control, and multi-tenancy through store-scoped headers and domain-based URL routing.

## Glossary

- **Platform_Admin_Dashboard**: The administrative interface used by platform owners (PLATFORM_ADMIN or PLATFORM_OWNER roles) to manage users, stores, plans, subscriptions, and permissions
- **Store_Admin_Dashboard**: The merchant control panel used by store team members to manage products, categories, orders, customers, coupons, inventory, members, roles, and settings
- **Storefront**: The customer-facing shop interface accessed via store domain URL, supporting guest and authenticated shopping
- **API_Client**: The centralized HTTP client module (`lib/api/client.ts`) that wraps native fetch with token management, refresh logic, and multi-tenancy headers
- **Redux_Store**: The centralized state management layer using Redux Toolkit with domain-specific slices and async thunks
- **Middleware**: The Next.js middleware (`middleware.ts`) responsible for route protection and authentication-based redirection
- **Permission_Guard**: The client-side permission checking system (`usePermission` hook and `PermissionGate` component) that controls UI element visibility
- **Form_System**: The form handling layer using React Hook Form with Zod validation schemas
- **Data_Table**: The reusable table component system powered by TanStack Table with server-side pagination, sorting, and filtering
- **Category_Tree_Builder**: The algorithm that transforms a flat category list into a nested tree structure
- **Order_State_Machine**: The frontend representation of valid order status transitions
- **Cart_Manager**: The storefront cart system with optimistic updates and rollback on failure
- **Access_Token**: The short-lived JWT (15 minutes) stored in-memory for authenticating API requests
- **Refresh_Token**: The long-lived JWT (7 days) stored in an httpOnly cookie for obtaining new access tokens
- **Customer_Token**: The JWT (7 days) used for storefront customer authentication, separate from admin JWT
- **Store_Context_Header**: The `x-store-id` HTTP header required for all Store Admin API requests

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to authenticate securely with the platform, so that I can access my dashboard and manage my resources.

#### Acceptance Criteria

1. WHEN a user submits login credentials with a valid identifier (email or phone matching format +?[0-9]{7,15}) and a password (1 to 128 characters), THE API_Client SHALL send a POST request to `/auth/login` with `{ identifier, password }` and, upon a successful response, store the returned access token in memory and persist the user object in the Redux_Store auth state
2. WHEN a user submits registration data with name (2 to 100 characters), email (valid email format), phone (matching format +?[0-9]{7,15}), and password (8 to 128 characters), THE API_Client SHALL send a POST request to `/auth/register`, store the returned access token in memory, persist the user object in the Redux_Store auth state, and the server response SHALL set the refresh token as an httpOnly cookie
3. WHEN a user logs out, THE API_Client SHALL send a POST request to `/auth/logout`, clear the in-memory access token, and the Redux_Store SHALL reset the auth state to its initial values (user: null, isAuthenticated: false, permissions: empty, currentStoreId: null)
4. WHEN the access token expires and a protected request returns HTTP 401, THE API_Client SHALL automatically send a POST request to `/auth/refresh` with credentials included (httpOnly cookie) and, upon success, store the new access token in memory and retry the original failed request exactly once
5. IF the token refresh request fails (non-2xx response or network error), THEN THE API_Client SHALL clear the in-memory access token, reset the Redux_Store auth state to unauthenticated, and redirect the user to the login page
6. THE API_Client SHALL store the access token only in a JavaScript variable (in-memory), never in localStorage or sessionStorage
7. WHEN a login succeeds and the user has system_role PLATFORM_ADMIN or PLATFORM_OWNER, THE Middleware SHALL redirect to the Platform Admin Dashboard
8. WHEN a login succeeds and the user has system_role USER, THE Middleware SHALL redirect to the Store Admin Dashboard
9. IF the login request returns HTTP 401 (invalid credentials), HTTP 422 (validation error), or HTTP 429 (rate limited), THEN THE API_Client SHALL store the error message from the response in the Redux_Store auth error state and set loading to false without storing any token
10. IF the registration request returns HTTP 409 (email or phone already registered) or HTTP 422 (validation error), THEN THE API_Client SHALL store the error message from the response in the Redux_Store auth error state and set loading to false without storing any token
11. WHILE a login or registration request is in progress, THE Redux_Store SHALL set auth loading to true and clear any previous error state

### Requirement 2: Route Protection and Navigation

**User Story:** As a platform operator, I want routes to be protected based on authentication state, so that unauthorized users cannot access restricted areas.

#### Acceptance Criteria

1. WHEN a user without a valid `refresh_token` cookie navigates to a protected route (paths under the `(platform)` or `(store-admin)` route groups), THE Middleware SHALL redirect the user to the `/login` page
2. WHEN a user with a valid `refresh_token` cookie navigates to an auth page (`/login`, `/register`, `/forgot-password`, or `/reset-password`), THE Middleware SHALL redirect the user to the `/dashboard` page
3. WHEN a user navigates to a storefront route (paths under the `(storefront)/[domain]` route group), THE Middleware SHALL allow access without requiring a `refresh_token` cookie
4. THE Middleware SHALL skip processing for requests matching Next.js internal paths (`_next/static`, `_next/image`), the `favicon.ico` file, and API routes (paths starting with `/api`)
5. IF the `refresh_token` cookie is present but the session has expired on the server, THEN THE Middleware SHALL still allow access to the protected route and delegate token validation to the API client refresh mechanism

### Requirement 3: Platform Admin User Management

**User Story:** As a platform admin, I want to manage all registered users, so that I can maintain platform security and user access.

#### Acceptance Criteria

1. WHEN a platform admin views the users page, THE Platform_Admin_Dashboard SHALL display a paginated table of all non-deleted users with columns: name, email, phone, system_role, is_active status, and last_login_at date, using a default page size of 20 and a maximum page size of 100
2. WHEN a platform admin enters a search term or selects filter values, THE Platform_Admin_Dashboard SHALL send a request with filter parameters supporting search by name, email, or phone, and filtering by system_role and is_active status, and update the displayed table with the filtered results
3. WHEN a platform admin activates or deactivates a user, THE Platform_Admin_Dashboard SHALL send a PATCH request to update the user's is_active status and display the updated status in the table upon success
4. WHEN a platform admin changes a user's system role, THE Platform_Admin_Dashboard SHALL send a PATCH request with the new role value selected from the available system roles (USER, SUPPORT, PLATFORM_ADMIN, PLATFORM_OWNER) and display the updated role in the table upon success
5. WHEN a platform admin initiates a user deletion, THE Platform_Admin_Dashboard SHALL display a confirmation prompt before sending the DELETE request, and remove the user from the displayed list only after a successful response
6. IF the server returns a 403 error when a platform admin attempts to deactivate, change the role of, or delete their own account, THEN THE Platform_Admin_Dashboard SHALL display an error message indicating that self-modification is not permitted
7. THE Data_Table SHALL support server-side pagination with page and limit parameters (default page 1, default limit 20, maximum limit 100), and column sorting with sortBy and sortOrder (asc or desc) parameters
8. IF a user management operation (activate, deactivate, role change, or delete) fails due to a network error or non-success server response, THEN THE Platform_Admin_Dashboard SHALL display an error message indicating the operation failed and preserve the current table state without modification

### Requirement 4: Platform Admin Store Management

**User Story:** As a platform admin, I want to manage all stores on the platform, so that I can approve, suspend, or archive stores as needed.

#### Acceptance Criteria

1. WHEN a platform admin views the stores page, THE Platform_Admin_Dashboard SHALL display a paginated table of all non-deleted stores with columns for store name, domain, status, owner name, and creation date, using a default page size of 20 and a maximum page size of 100
2. WHEN a platform admin enters a search term or selects a status filter on the stores page, THE Platform_Admin_Dashboard SHALL filter the displayed stores by matching the search term against store name or domain, and by the selected status value (DRAFT, ACTIVE, SUSPENDED, or ARCHIVED)
3. WHEN a platform admin selects a store and initiates a status change, THE Platform_Admin_Dashboard SHALL only enable target status options that are valid transitions from the current status (DRAFT→ACTIVE, ACTIVE→SUSPENDED, ACTIVE→ARCHIVED, SUSPENDED→ACTIVE, SUSPENDED→ARCHIVED)
4. IF a platform admin attempts an invalid store status transition, THEN THE Platform_Admin_Dashboard SHALL disable the invalid option in the UI and not send the request to the backend
5. WHEN a store status change is successfully submitted and confirmed by the backend, THE Platform_Admin_Dashboard SHALL update the store's status in the table and display a success notification within 1 second of receiving the response

### Requirement 5: Platform Admin Plans and Subscriptions

**User Story:** As a platform admin, I want to manage subscription plans and view store subscriptions, so that I can control the platform's pricing and billing.

#### Acceptance Criteria

1. WHEN a platform admin creates a plan, THE Platform_Admin_Dashboard SHALL send a POST request with code (1–50 lowercase alphanumeric and hyphens), name (1–100 characters), price_monthly (0.01–999,999.99), and optional price_yearly (0.01–9,999,999.99), max_stores (1–10,000), max_products (1–1,000,000), and max_staff (1–10,000) fields
2. IF a platform admin creates a plan with a code that already exists, THEN THE Platform_Admin_Dashboard SHALL display an error message indicating the plan code is already in use and preserve the form input
3. WHEN a platform admin edits a plan, THE Platform_Admin_Dashboard SHALL send a PATCH request with only the modified fields limited to name, price_monthly, price_yearly, max_stores, max_products, and max_staff
4. WHEN a platform admin views subscriptions, THE Platform_Admin_Dashboard SHALL display a paginated list (1–100 items per page, default 20) showing store name, plan name, status (TRIALING, ACTIVE, PAST_DUE, CANCELED, or EXPIRED), billing cycle (MONTHLY or YEARLY), current_period_starts_at, and current_period_ends_at
5. THE Platform_Admin_Dashboard SHALL display a dashboard with platform-wide statistics including total users count, total stores count, active stores count, total subscriptions count, and monthly revenue calculated from active and trialing subscriptions
6. IF a platform admin attempts to delete a plan that has active or trialing subscriptions, THEN THE Platform_Admin_Dashboard SHALL display an error message indicating the plan cannot be deleted while in use and retain the plan unchanged

### Requirement 6: Store Admin Multi-Tenancy

**User Story:** As a store admin, I want my actions to be scoped to my selected store, so that I can manage multiple stores without data leakage.

#### Acceptance Criteria

1. WHEN a store admin selects a store, THE Redux_Store SHALL update the currentStoreId, persist the selected store ID to local storage, and fetch the user's permissions array for that store from the membership endpoint
2. IF the permissions fetch fails after store selection, THEN THE Redux_Store SHALL clear the currentStoreId, remove the persisted store ID from local storage, and display an error message indicating the store could not be loaded
3. THE API_Client SHALL attach the `x-store-id` header with the current store ID to every request targeting `/api/stores/:storeId/*` endpoints
4. IF a store admin action triggers an API request while currentStoreId is null, THEN THE API_Client SHALL block the request and redirect the user to the store selection view
5. THE API_Client SHALL include the store ID in the URL path for all requests to `/api/stores/:storeId/*` endpoints, and the path storeId SHALL match the `x-store-id` header value
6. WHEN a store admin switches stores, THE Redux_Store SHALL reset the products, orders, categories, customers, coupons, inventory, and members slices to their initial state, then update the currentStoreId and fetch permissions and data for the newly selected store
7. WHEN the application initializes and a persisted store ID exists in local storage, THE Redux_Store SHALL restore the currentStoreId from local storage and fetch the user's permissions for that store before rendering store-scoped views

### Requirement 7: Store Admin Product Management

**User Story:** As a store admin, I want to manage my store's product catalog, so that I can list items for sale with variants, options, and media.

#### Acceptance Criteria

1. WHEN a store admin views the products page, THE Store_Admin_Dashboard SHALL display a paginated table (default 20 items per page, max 100) sortable by name, price, status, and creation date, showing each product's name, status (DRAFT/ACTIVE/ARCHIVED), base price, inventory indicator (in-stock if available_quantity > 0 for at least one active variant, out-of-stock otherwise), and creation date
2. WHEN a store admin creates a product, THE Form_System SHALL validate the input using Zod schema (name: 2-200 chars, base_price: positive decimal with max 2 decimal places, slug: unique per store) before submission and display field-level validation errors inline for any failing fields
3. WHEN a store admin adds product options and values, THE Store_Admin_Dashboard SHALL allow creating up to 3 options per product (e.g., Color) each with up to 50 values (e.g., Red, Blue), and SHALL provide an explicit action to generate variant combinations as the cartesian product of all option values
4. WHEN a store admin uploads product media, THE Store_Admin_Dashboard SHALL accept image files (JPEG, PNG, WebP, max 5 MB per file, max 20 media items per product), send the file as multipart/form-data, and display the uploaded image in a drag-to-reorder media gallery
5. WHEN a store admin changes a product's status, THE Store_Admin_Dashboard SHALL only allow valid transitions (DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT) by disabling or hiding invalid transition options in the UI
6. IF a store admin attempts an invalid status transition, THEN THE Store_Admin_Dashboard SHALL display an error message indicating the transition from the current status to the requested status is not permitted
7. WHEN a store admin duplicates a product, THE Store_Admin_Dashboard SHALL send a POST request to the duplicate endpoint and, upon a successful 201 response, navigate to the new product's edit page
8. IF a product media upload fails, THEN THE Store_Admin_Dashboard SHALL display an error message indicating the upload failure reason and preserve any previously uploaded media in the gallery unchanged

### Requirement 8: Store Admin Category Management

**User Story:** As a store admin, I want to organize products into hierarchical categories, so that customers can browse products by category.

#### Acceptance Criteria

1. WHEN a store admin views categories, THE Category_Tree_Builder SHALL transform the flat category list from the API into a nested tree structure sorted by sort_order (ascending) at each level, supporting a maximum hierarchy depth of 3 levels
2. WHEN a store admin creates a category, THE Form_System SHALL validate that name is provided (1 to 100 characters), that slug is auto-generated from the name and unique per store, and that parent_id (if provided) references an existing category within the same store
3. IF category creation or update validation fails, THEN THE Form_System SHALL display an error message indicating which field failed validation and preserve the entered form data
4. WHEN a store admin reorders categories, THE Store_Admin_Dashboard SHALL send a PATCH request with the new sort_order values for affected categories, containing a maximum of 200 items per request
5. IF a reorder request contains a category ID that does not exist in the store, THEN THE Store_Admin_Dashboard SHALL display an error message indicating the invalid category and not apply any reorder changes
6. THE Category_Tree_Builder SHALL place categories with invalid parent_id values (referencing non-existent categories in the fetched list) as root nodes (orphan handling)
7. WHEN a store admin deletes a category, THE Store_Admin_Dashboard SHALL reassign the deleted category's children to the deleted category's parent (or to root if the deleted category had no parent)

### Requirement 9: Store Admin Order Management

**User Story:** As a store admin, I want to manage customer orders through their lifecycle, so that I can process, ship, and deliver orders efficiently.

#### Acceptance Criteria

1. WHEN a store admin views an order, THE Store_Admin_Dashboard SHALL display order details including order number, source, current status, payment status, line items with product name, variant, SKU, quantity, unit price, and line total, customer name, email, phone, shipping address, payment status, timeline events sorted by most recent first, and available status transition buttons
2. WHEN a store admin transitions an order status, THE Order_State_Machine SHALL only allow transitions defined in the state machine: DRAFT→PENDING or CANCELED, PENDING→CONFIRMED or CANCELED, CONFIRMED→PROCESSING or CANCELED, PROCESSING→PREPARING or CANCELED, PREPARING→SHIPPED or CANCELED, SHIPPED→IN_TRANSIT or RETURNED, IN_TRANSIT→OUT_FOR_DELIVERY or RETURNED, OUT_FOR_DELIVERY→DELIVERED or RETURNED, DELIVERED→RETURNED, and no transitions from CANCELED or RETURNED
3. IF a store admin attempts an invalid order status transition, THEN THE Order_State_Machine SHALL prevent the action by not displaying the invalid transition as an available option
4. WHEN a store admin creates a manual order, THE Form_System SHALL validate that at least 1 and at most 100 line items are provided, each item has a positive quantity not exceeding 9999, shipping address includes full name (1-200 characters), city (1-100 characters), and street line 1 (1-300 characters), and that all referenced product variants exist, are active, and have sufficient available inventory before submission
5. WHEN a store admin adds a note to an order, THE Store_Admin_Dashboard SHALL append the note (maximum 1000 characters) to the order's timeline with the actor identity and timestamp, and display the updated timeline
6. WHILE an order is in a non-terminal status (any status other than CANCELED or RETURNED), THE Store_Admin_Dashboard SHALL display only the valid next statuses as action buttons based on the current order status
7. IF a manual order creation fails validation, THEN THE Form_System SHALL display an error message indicating which fields failed validation and preserve the entered form data
8. WHILE an order is in a terminal status (CANCELED or RETURNED), THE Store_Admin_Dashboard SHALL display no status transition buttons and indicate the order is in a final state

### Requirement 10: Store Admin Customer Management

**User Story:** As a store admin, I want to manage my store's customers, so that I can view their order history and manage their accounts.

#### Acceptance Criteria

1. WHEN a store admin views customers, THE Store_Admin_Dashboard SHALL display a paginated table (default 20 rows, maximum 100 per page) with customer name, email, phone, status, total orders, and total spent, supporting search by name, email, or phone and filtering by status (ACTIVE, BLOCKED, ARCHIVED)
2. WHEN a store admin views a customer's detail page, THE Store_Admin_Dashboard SHALL display the customer's profile (first name, last name, email, phone, gender, birth date, status, accepts marketing, notes, created date), a paginated order history (default 20, maximum 100 per page), and saved addresses
3. WHEN a store admin creates or edits a customer, THE Form_System SHALL validate the input: first_name (optional, 1-100 characters), last_name (optional, 1-100 characters), email (optional, valid email format, maximum 255 characters), phone (optional, 8-20 characters), notes (optional, maximum 1000 characters), status (ACTIVE, BLOCKED, or ARCHIVED), and require that at least one of email or phone is provided
4. IF a store admin submits a customer with an email or phone that already exists for another customer in the same store, THEN THE Form_System SHALL reject the submission with an error message indicating the duplicate field
5. WHEN a store admin manages customer addresses, THE Store_Admin_Dashboard SHALL support adding, editing, deleting, and setting a default address with required fields: full_name (1-200 characters), city (1-100 characters), street_line_1 (1-300 characters), and type (SHIPPING, BILLING, or OTHER)
6. WHEN a store admin sets an address as default, THE Store_Admin_Dashboard SHALL unset the previous default address for that customer so that only one default address exists at any time

### Requirement 11: Store Admin Coupon Management

**User Story:** As a store admin, I want to create and manage discount coupons, so that I can run promotions and track their usage.

#### Acceptance Criteria

1. WHEN a store admin submits the coupon creation form, THE Form_System SHALL validate that the code is between 2 and 50 characters and unique per store (case-insensitive), type is PERCENTAGE or FIXED, value is between 1 and 100 for PERCENTAGE type or greater than 0 for FIXED type, minimum order amount (if provided) is non-negative, maximum discount amount (if provided) is positive, usage limit and usage limit per customer (if provided) are positive integers, and starts_at is before ends_at when both are provided
2. IF coupon creation validation fails, THEN THE Form_System SHALL display an error message indicating which fields failed validation and preserve the entered form data
3. WHEN a store admin views a coupon's detail page, THE Store_Admin_Dashboard SHALL display usage statistics including total number of times used, total discount amount given, and a paginated usage history showing the customer, order, discount amount, and date for each usage
4. WHEN a store admin validates a coupon by providing a coupon code and an order subtotal, THE Store_Admin_Dashboard SHALL send a POST request to the validate endpoint and display whether the coupon is currently valid based on active status, current date within starts_at and ends_at range, total usage count not exceeding usage_limit, and order subtotal meeting minimum_order_amount, and display the reason when the coupon is invalid
5. IF a store admin attempts to delete a coupon that has existing usage records, THEN THE Store_Admin_Dashboard SHALL reject the deletion and display an error message indicating the coupon cannot be deleted because it has been used

### Requirement 12: Store Admin Inventory Management

**User Story:** As a store admin, I want to track and adjust product inventory levels, so that I can prevent overselling and manage stock efficiently.

#### Acceptance Criteria

1. WHEN a store admin views inventory, THE Store_Admin_Dashboard SHALL display a paginated table (maximum 50 items per page) of variants with product name, variant title, SKU, available quantity, total quantity, reserved quantity, and low stock threshold, sorted by product name ascending by default
2. WHEN a store admin views low-stock items, THE Store_Admin_Dashboard SHALL display only variants where available_quantity is at or below the low_stock_threshold, using the same paginated table format
3. WHEN a store admin submits a valid inventory adjustment (type: one of IN, ADJUSTMENT_IN, OUT, or ADJUSTMENT_OUT; quantity_change: integer between 1 and 99,999; reason: optional string up to 500 characters), THE System SHALL update the variant's available_quantity and total_quantity accordingly and record an InventoryMovement entry with the actor, type, quantity_change, reason, and timestamp
4. IF a store admin submits an OUT or ADJUSTMENT_OUT adjustment where quantity_change exceeds the variant's current available_quantity, THEN THE Form_System SHALL reject the adjustment and display an error message indicating insufficient available stock
5. IF a store admin submits an inventory adjustment with missing or invalid fields, THEN THE Form_System SHALL display a validation error message indicating which fields are invalid without modifying inventory
6. WHEN a store admin views inventory movements for a variant, THE Store_Admin_Dashboard SHALL display a paginated list (maximum 50 items per page) of stock changes sorted by timestamp descending (newest first), showing movement type, quantity_change, reason, actor name, and timestamp

### Requirement 13: Store Admin Members and Roles

**User Story:** As a store admin, I want to manage team members and their roles, so that I can control who has access to what within my store.

#### Acceptance Criteria

1. WHEN a store admin submits the invite member form, THE Form_System SHALL validate that the email field is a valid email format (RFC 5322, maximum 254 characters) and that a role is selected from the list of roles belonging to the current store, then send a POST request to the invite endpoint with the email and role_id
2. IF the invite request fails due to the user not being registered, duplicate membership, or invalid role, THEN THE Store_Admin_Dashboard SHALL display an error message indicating the specific failure reason returned by the server
3. WHEN a store admin changes a member's role, THE Store_Admin_Dashboard SHALL send a PATCH request with the new role_id, excluding the store owner's membership from role change actions in the UI
4. WHEN a store admin creates a custom role, THE Store_Admin_Dashboard SHALL submit a role creation request with a name (2 to 50 characters) and an optional description (maximum 255 characters), and the system SHALL auto-generate the slug from the provided name
5. WHEN a store admin updates role permissions, THE Store_Admin_Dashboard SHALL send a PUT request with the complete array of permission_ids (0 to 200 items) selected from the available permission list for that role
6. WHILE a role has is_protected set to true, THE Store_Admin_Dashboard SHALL disable editing of the role name and prevent deletion of that role

### Requirement 14: Store Admin Settings

**User Story:** As a store admin, I want to configure my store's settings, so that I can customize branding, SEO, and contact information.

#### Acceptance Criteria

1. WHEN a store admin updates general settings, THE Form_System SHALL validate that name is between 2 and 100 characters and domain is between 3 and 63 lowercase alphanumeric-or-hyphen characters, and send a PATCH request with name and domain fields
2. IF general settings validation fails, THEN THE Form_System SHALL display inline error messages on the invalid fields and prevent submission
3. WHEN a store admin updates branding, THE Store_Admin_Dashboard SHALL allow uploading logo and favicon image files of maximum 2 MB each in PNG, JPG, SVG, or WebP format, and send a PATCH request with the resulting URLs
4. WHEN a store admin updates SEO settings, THE Form_System SHALL validate that meta_title is at most 70 characters and meta_description is at most 160 characters, and send a PATCH request with meta_title and meta_description
5. WHEN a store admin updates contact info, THE Form_System SHALL validate that support_email is a valid email format and support_phone matches the pattern +?[0-9]{7,15}, and send a PATCH request with support_email, support_phone, and social link URLs
6. IF a settings PATCH request fails, THEN THE Form_System SHALL display an error message indicating the failure reason and preserve the entered form data

### Requirement 15: Permission-Based UI Rendering

**User Story:** As a store team member, I want to see only the features I have permission to access, so that the interface is relevant to my role.

#### Acceptance Criteria

1. THE Permission_Guard SHALL render a child UI element if and only if the user's permissions array (read from the Redux auth state) contains the required permission string, and SHALL render nothing in place of the element when the permission is absent unless an explicit fallback component is provided
2. WHEN building the sidebar navigation, THE Permission_Guard SHALL filter menu items by comparing each item's required permission string against the user's permissions array, rendering only items whose permission is present, resulting in an empty sidebar when the permissions array contains none of the sidebar permission strings
3. WHEN a user lacks a specific action permission (e.g., product:create), THE Permission_Guard SHALL hide the corresponding action button (e.g., "Add Product") by removing it from the rendered DOM rather than visually disabling it
4. IF the backend returns a 403 status code for a request, THEN THE Store_Admin_Dashboard SHALL display a toast notification indicating access was denied, auto-dismiss the notification after 5 seconds, and preserve the current page state without navigation or data loss
5. WHEN the user's store context changes via the setCurrentStore action, THE Permission_Guard SHALL re-evaluate all visible permission-gated elements against the updated permissions array within the same render cycle

### Requirement 16: Storefront Store Display

**User Story:** As a customer, I want to browse a store's products and categories, so that I can find items I want to purchase.

#### Acceptance Criteria

1. WHEN a customer visits a store URL (`/[domain]`), THE Storefront SHALL fetch and display the store's information including name, logo, description, and categories with the category tree rendered as navigable links
2. IF the store domain does not resolve to an active store (404 or 403 response), THEN THE Storefront SHALL display an error page indicating the store is not found or currently unavailable, without exposing internal error details
3. WHEN a customer browses products, THE Storefront SHALL display a paginated product list with a default page size of 20 and a maximum page size of 100, supporting filtering by category, price range (minimum 0), and sorting by name, price, or creation date in ascending or descending order (defaulting to creation date descending)
4. WHEN a customer searches for products with a query of at least 1 character and at most 200 characters, THE Storefront SHALL send a debounced search request (300ms delay after the last keystroke) to the search endpoint and display matching results with the same pagination defaults as the product listing
5. WHEN a customer views a product detail page, THE Storefront SHALL display product name, description, price, compare-at price (if present), media gallery sorted by sort order, available variants with their option values, and an add-to-cart button that is enabled only for variants with available quantity greater than zero
6. WHEN a customer browses categories, THE Storefront SHALL display the category tree as a hierarchical list reflecting parent-child relationships and allow navigation to category-specific product listings that show only published and active products within the selected category

### Requirement 17: Storefront Cart Operations

**User Story:** As a customer, I want to manage a shopping cart, so that I can collect items before checkout.

#### Acceptance Criteria

1. WHEN a customer adds an item to the cart, THE Cart_Manager SHALL optimistically append the item to the local cart state within the same render cycle, then send a POST request with product_id, variant_id, and quantity to the cart items endpoint, and upon receiving the server response, replace the local cart state with the server-returned cart data (items, subtotal, discount_total, shipping_total, grand_total)
2. IF a cart operation fails or the server does not respond within 10 seconds, THEN THE Cart_Manager SHALL rollback the local cart state to the pre-operation snapshot and display an error notification for 5 seconds indicating the operation that failed (add, update, or remove)
3. WHEN a customer updates item quantity, THE Cart_Manager SHALL validate that the quantity is an integer between 0 and 9999 before sending a PATCH request with the new quantity to the cart item endpoint, where quantity 0 removes the item from the cart
4. WHEN a customer applies a coupon code between 2 and 50 characters, THE Cart_Manager SHALL send a POST request to the apply-coupon endpoint with the code and update the local cart state with the server-returned discount_total and grand_total values
5. THE API_Client SHALL include `credentials: "include"` on all storefront requests to maintain the session cookie for guest cart persistence
6. WHEN a customer removes a coupon, THE Cart_Manager SHALL send a DELETE request to the coupon endpoint and update the local cart state by setting discount_total to zero and recalculating grand_total as subtotal plus shipping_total
7. WHILE a cart server request is in progress, THE Cart_Manager SHALL set a loading flag on the affected cart item or cart-level operation to allow the UI to indicate the pending state and SHALL disable duplicate submissions for the same operation until the request completes or times out

### Requirement 18: Storefront Checkout

**User Story:** As a customer, I want to complete a purchase, so that I can place an order for delivery.

#### Acceptance Criteria

1. WHEN a customer submits checkout, THE Form_System SHALL validate customer_name (2-100 chars), customer_phone (Libyan format matching +218XXXXXXXXX), shipping address (full_name: 1-200 chars, city: 1-100 chars, street_line_1: 1-300 chars required), and payment_method (one of CASH_ON_DELIVERY, CARD, BANK_TRANSFER, WALLET, MANUAL)
2. WHEN checkout succeeds, THE Storefront SHALL display an order confirmation with the order number and clear the cart state in the Redux_Store
3. IF checkout fails due to validation errors (422), THEN THE Form_System SHALL map server errors to the corresponding form fields using the error path property
4. THE Storefront SHALL support both guest checkout (using session cookie) and authenticated checkout (using customer token), with the API_Client automatically including the appropriate credentials
5. IF checkout fails due to insufficient inventory (400), THEN THE Storefront SHALL display an error message indicating which items are out of stock and allow the customer to update their cart

### Requirement 19: Storefront Customer Account

**User Story:** As a returning customer, I want to create an account and manage my profile, so that I can track orders and save addresses.

#### Acceptance Criteria

1. WHEN a customer registers with first_name (2-100 characters), email (valid email format, max 255 characters), phone (8-20 characters), and password (8-128 characters), THE Form_System SHALL validate all fields and upon successful registration store the returned customer token in memory
2. IF customer registration returns HTTP 409 (email or phone already exists in the store), THEN THE Form_System SHALL display an error message indicating the duplicate field without storing any token
3. WHEN a customer logs in with valid email and password, THE API_Client SHALL store the customer token in memory and use it for subsequent authenticated storefront requests via the Authorization header
4. WHEN an authenticated customer views their orders, THE Storefront SHALL fetch and display their order history paginated (default 20, max 100 per page) with order number, status, payment status, total, and placed date, sorted by most recent first
5. WHEN an authenticated customer manages addresses, THE Storefront SHALL support adding (full_name, city, street_line_1 required), editing, deleting, and setting a default address, where setting a new default unsets the previous default

### Requirement 20: Storefront Order Lookup

**User Story:** As a customer, I want to look up my order status without logging in, so that I can track my delivery.

#### Acceptance Criteria

1. WHEN a customer submits an order lookup request with an order_number (1–50 characters) and a verification_value (1–255 characters representing either an email or phone number), THE Storefront SHALL send a GET request to the lookup endpoint and return the order only if the order_number matches an order in the current store AND the verification_value matches either the order's customer_email (case-insensitive) or customer_phone (exact match)
2. WHEN an order is successfully matched, THE Storefront SHALL display the order_number, status, payment_status, items (product_name, variant_title, quantity, unit_price, line_total), shipping address, order timeline entries, subtotal, discount_total, shipping_total, grand_total, and placed_at
3. IF the order_number does not exist in the store or the verification_value does not match the order's customer_email or customer_phone, THEN THE Storefront SHALL return a generic not-found error without indicating whether the order_number exists, to prevent order enumeration
4. IF the order_number or verification_value is missing or fails length validation, THEN THE Storefront SHALL return a 400 error indicating the required fields are missing or invalid
5. WHILE the order lookup endpoint is unauthenticated, THE Storefront SHALL enforce a rate limit of no more than 10 requests per 15-minute window per IP address, returning HTTP 429 when the threshold is exceeded

### Requirement 21: Form Validation

**User Story:** As a user, I want immediate feedback on form errors, so that I can correct mistakes before submission.

#### Acceptance Criteria

1. WHEN the user triggers form submission, THE Form_System SHALL validate all form inputs client-side using Zod schemas and, IF one or more fields are invalid, THEN THE Form_System SHALL prevent the request from being sent to the backend and display the corresponding Zod error message adjacent to each invalid field within 200 milliseconds
2. WHEN the backend returns a 422 validation error, THE Form_System SHALL parse the error array and display each error message adjacent to its corresponding form field by matching the `path` property to the field name; IF an error's `path` does not match any visible form field, THEN THE Form_System SHALL display that error in a summary area above or below the form
3. WHEN a form is submitting, THE Form_System SHALL disable the submit button, display a loading indicator within the button, and ignore any additional submit attempts until the request completes or fails
4. THE Form_System SHALL preserve valid field values when displaying validation errors, requiring the user to correct only invalid fields without re-entering previously valid data
5. WHEN the user modifies a field that has a displayed validation error, THE Form_System SHALL clear that field's error message upon the field losing focus (blur) if the new value passes its Zod schema validation

### Requirement 22: Data Table Functionality

**User Story:** As an admin user, I want sortable, paginated tables for data-heavy views, so that I can efficiently browse and find records.

#### Acceptance Criteria

1. THE Data_Table SHALL support server-side pagination by dispatching requests with page (default: 1) and limit (default: 20, allowed values: 10, 20, 50) parameters and displaying pagination controls that show the current page number, total pages, and total record count from the PaginationMeta response
2. THE Data_Table SHALL support column sorting by sending sortBy and sortOrder (asc or desc) parameters to the backend, and SHALL display a visual sort direction indicator on the currently sorted column header
3. WHEN data is loading, THE Data_Table SHALL display skeleton placeholder rows matching the current page limit count in place of content
4. WHEN no data is available, THE Data_Table SHALL display an empty state containing an illustrative icon and a descriptive message indicating no records were found
5. THE Data_Table SHALL support row actions (view, edit, delete, status change) via action buttons or a dropdown menu, where each action is conditionally rendered based on the user's permissions for the corresponding module
6. IF a data fetch request fails, THEN THE Data_Table SHALL display an error message indicating the failure and provide a retry action that re-dispatches the original request
7. WHEN the user triggers a delete row action, THE Data_Table SHALL display a confirmation dialog requiring explicit user confirmation before dispatching the delete request to the backend

### Requirement 23: Internationalization and RTL Support

**User Story:** As a user, I want to use the application in Arabic or English, so that I can work in my preferred language.

#### Acceptance Criteria

1. WHEN the locale is set to "ar", THE Redux_Store SHALL set direction to "rtl" and the document `dir` attribute SHALL be set to "rtl"
2. WHEN the locale is set to "en", THE Redux_Store SHALL set direction to "ltr" and the document `dir` attribute SHALL be set to "ltr"
3. THE Application SHALL default to locale "ar" when no locale preference has been previously stored, and SHALL persist the selected locale in localStorage under the key defined in STORAGE_KEYS.LANGUAGE so that the preference is retained across page reloads and sessions
4. THE Storefront SHALL render all system UI text (navigation labels, button labels, form labels, placeholder text, validation messages, and system notifications) in the selected locale using next-intl translations; user-generated content (product names, descriptions, store names) SHALL be rendered as stored in the database without translation
5. THE Store_Admin_Dashboard SHALL render navigation, labels, form placeholders, and system messages in the selected locale using next-intl translations
6. IF a translation key is missing for the selected locale, THEN THE Application SHALL fall back to displaying the corresponding translation in the other supported locale ("en" if "ar" is missing, "ar" if "en" is missing)
7. WHILE the locale is set to "ar", THE Application SHALL mirror layout-directional CSS properties (margins, paddings, text alignment, flexbox/grid directions) to follow RTL reading order using Tailwind CSS logical utilities or RTL-aware classes

### Requirement 24: Theme Support

**User Story:** As a user, I want to switch between dark and light modes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Platform_Admin_Dashboard, Store_Admin_Dashboard, and Storefront SHALL support three theme modes: dark, light, and system preference, via next-themes with CSS variables applied to all UI components
2. WHEN a user switches themes, THE application SHALL apply the selected theme to all visible UI elements within 200 milliseconds without triggering a full page reload
3. WHEN a user switches themes, THE application SHALL persist the selected preference in localStorage so that the same theme is applied on subsequent visits and page navigations without a flash of the incorrect theme
4. IF the user has selected "system preference" mode, THEN THE application SHALL follow the operating system's color scheme and update the displayed theme when the OS setting changes without requiring a manual page refresh
5. IF no theme preference has been previously stored, THEN THE application SHALL default to the system preference mode

### Requirement 25: Error Handling

**User Story:** As a user, I want clear error feedback, so that I can understand what went wrong and how to recover.

#### Acceptance Criteria

1. WHEN a network error occurs (server unreachable), THE application SHALL display a connection error banner that remains visible until the network connection is restored or the user manually dismisses it, and SHALL not block interaction with other UI elements
2. WHEN a 429 rate limit response is received, THE application SHALL display a "too many requests" notification, disable the triggering action control, and re-enable it after the duration specified in the server's Retry-After header (or after 60 seconds if no Retry-After header is present)
3. WHEN a 409 conflict response is received, THE application SHALL display the conflict message returned in the server response body (e.g., "email already registered") as a toast notification that remains visible for at least 5 seconds or until dismissed by the user
4. WHEN a 403 forbidden response is received, THE application SHALL display an access denied toast notification that auto-dismisses after 5 seconds or can be manually dismissed by the user
5. IF a network connection is restored after a disconnection, THEN THE application SHALL display a "connection restored" notification and prompt the user to retry any operations that failed during the disconnection, without automatically resubmitting data-modifying operations (POST, PUT, PATCH, DELETE)
6. WHEN a 422 validation error response is received, THE application SHALL map each server-provided field error to the corresponding form field and display the error message adjacent to that field within 200 milliseconds of receiving the response

### Requirement 26: API Client Architecture

**User Story:** As a developer, I want a centralized API client with automatic token and header management, so that all API calls are consistent and secure.

#### Acceptance Criteria

1. THE API_Client SHALL attach the `Authorization: Bearer <token>` header for all requests where `auth: true` and an access token exists in memory
2. THE API_Client SHALL attach the `x-store-id` header with the string-converted storeId value for all requests where a storeId is provided in the request options
3. THE API_Client SHALL include `credentials: "include"` on all requests to support httpOnly cookie transmission
4. WHEN the API_Client receives a 401 response for a request where `auth: true`, THE API_Client SHALL attempt a token refresh by calling the refresh endpoint with credentials included, and IF the refresh succeeds, THE API_Client SHALL retry the original request exactly once with the new token
5. IF the token refresh attempt fails (non-2xx response or network error), THEN THE API_Client SHALL clear the in-memory access token, redirect the user to the login page, and not retry the original request
6. THE API_Client SHALL parse all successful responses (2xx status) as typed `ApiResponse<T>` objects and SHALL throw the parsed response body as an `ApiError` object for any non-2xx response that is not handled by the token refresh mechanism
7. THE API_Client SHALL set the `Content-Type: application/json` header on all requests by default, allowing callers to override it via custom headers

### Requirement 27: State Management

**User Story:** As a developer, I want predictable state management with loading and error states, so that the UI accurately reflects the application state.

#### Acceptance Criteria

1. THE Redux_Store SHALL maintain separate slices for auth, products, orders, categories, customers, coupons, inventory, members, platform, cart, and ui, each initialized with loading set to false and error set to null
2. WHEN an async thunk is dispatched, THE Redux_Store SHALL set the slice's loading field to true and error field to null, and WHEN the thunk is fulfilled or rejected, THE Redux_Store SHALL set loading back to false
3. WHEN a thunk is rejected, THE Redux_Store SHALL store the rejected payload string in the corresponding slice's error field
4. THE Redux_Store SHALL provide typed hooks useAppSelector and useAppDispatch for all component state access and dispatch calls
5. WHEN a cart async thunk is dispatched, THE Redux_Store SHALL apply an optimistic update to the cart slice immediately, and IF the thunk is rejected, THEN THE Redux_Store SHALL roll back the cart slice to its pre-dispatch state
