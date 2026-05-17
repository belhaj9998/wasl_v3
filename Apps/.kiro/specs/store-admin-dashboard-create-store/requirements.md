# Requirements Document

## Introduction

This feature adds a "Create Store" button to the Store Admin Dashboard and improves the overall dashboard page design. The button allows merchants to create additional stores directly from the dashboard, regardless of whether they currently have zero stores or multiple stores. The dashboard design is enhanced with a proper page header, welcome section, and quick-action area to improve the merchant experience.

## Glossary

- **Dashboard**: The main landing page of the Store Admin interface displaying store statistics, charts, and alerts
- **Store_Admin_Layout**: The layout component wrapping all store admin pages, providing sidebar, header, and store selector
- **Store_Selection_Prompt**: The full-screen view shown when no store is currently selected, listing the user's available stores
- **Create_Store_Button**: A UI button that initiates the store creation flow
- **Create_Store_Dialog**: A modal dialog containing the form to create a new store (name and domain fields)
- **Subscription_Plan**: The plan associated with a user's store that defines limits including max_stores, max_products, and max_staff
- **Store_Limit**: The maximum number of stores a user can create, defined by their subscription plan's max_stores field (null means unlimited)

## Requirements

### Requirement 1: Create Store Button Visibility on Dashboard

**User Story:** As a store admin, I want to see a "Create Store" button on my dashboard page, so that I can quickly create additional stores without navigating away.

#### Acceptance Criteria

1. WHEN the Dashboard page loads and the user has one or more stores, THE Dashboard SHALL display a "Create Store" button in the page header section
2. WHILE the user has zero stores, THE Store_Selection_Prompt SHALL display a "Create Store" button alongside the empty state message
3. WHILE the user has one or more stores and navigates between dashboard views, THE Dashboard SHALL persist the "Create Store" button in the same page header position without re-rendering or repositioning
4. THE Create_Store_Button SHALL have an accessible label of "Create Store" readable by screen readers and SHALL be reachable via keyboard Tab navigation

### Requirement 2: Create Store Dialog

**User Story:** As a store admin, I want a dialog form to create a new store, so that I can provide the store name and domain without leaving the dashboard.

#### Acceptance Criteria

1. WHEN the user clicks the Create_Store_Button, THE Dashboard SHALL open the Create_Store_Dialog as a modal overlay
2. THE Create_Store_Dialog SHALL contain a text input for store name (required, minimum 2 characters, maximum 100 characters) that displays an inline validation error when the input is empty or outside the allowed length on form submission
3. THE Create_Store_Dialog SHALL contain a text input for store domain (required, lowercase alphanumeric and hyphens only, must not start or end with a hyphen, must not contain consecutive hyphens, minimum 3 characters, maximum 63 characters) that displays an inline validation error when the input violates any of these rules on form submission
4. THE Create_Store_Dialog SHALL display a "Create" submit button and a "Cancel" button
5. WHEN the user clicks "Cancel" or presses Escape, THE Create_Store_Dialog SHALL close without submitting data and discard any entered form values
6. THE Create_Store_Dialog SHALL display field labels and placeholder text in the active locale (Arabic or English)
7. WHEN the user clicks the "Create" button and all fields pass client-side validation, THE Create_Store_Dialog SHALL disable the "Create" button, send a POST request with the store name and domain to the store creation endpoint, and upon a successful response, close the dialog and add the new store to the displayed store list without requiring a full page reload
8. IF the store creation request fails due to a duplicate domain (HTTP 409) or subscription plan limit exceeded, THEN THE Create_Store_Dialog SHALL display an error message indicating the specific failure reason returned by the server and re-enable the "Create" button
9. IF the store creation request fails due to a network error or unexpected server error (HTTP 5xx), THEN THE Create_Store_Dialog SHALL display an error message indicating the operation failed, preserve the entered form data, and re-enable the "Create" button

### Requirement 3: Store Creation Form Validation

**User Story:** As a store admin, I want clear validation feedback on the store creation form, so that I can correct errors before submitting.

#### Acceptance Criteria

1. WHEN the user submits the form with an empty store name, THE Create_Store_Dialog SHALL display a validation error message below the name field
2. WHEN the user submits the form with an empty domain, THE Create_Store_Dialog SHALL display a validation error message below the domain field
3. WHEN the user enters a domain containing characters other than lowercase letters (a-z), digits (0-9), or hyphens, THE Create_Store_Dialog SHALL display a validation error indicating that only lowercase letters, digits, and hyphens are allowed
4. WHEN the user enters a store name shorter than 2 characters or longer than 100 characters, THE Create_Store_Dialog SHALL display a validation error message below the name field indicating the name must be between 2 and 100 characters
5. WHEN the user enters a domain shorter than 3 characters or longer than 63 characters, THE Create_Store_Dialog SHALL display a validation error message below the domain field indicating the domain must be between 3 and 63 characters
6. WHEN the user enters a domain that starts or ends with a hyphen, THE Create_Store_Dialog SHALL display a validation error indicating the domain must start and end with a lowercase letter or digit
7. IF all fields pass validation, THEN THE Create_Store_Dialog SHALL enable the submit button and allow form submission

### Requirement 4: Store Creation Submission

**User Story:** As a store admin, I want the store creation to submit to the backend and provide feedback, so that I know whether my store was created successfully.

#### Acceptance Criteria

1. WHEN the user submits a valid form, THE Create_Store_Dialog SHALL send a POST request to the /stores endpoint with name and domain fields, authenticated via the API_Client with the current access token
2. WHILE the creation request is in progress, THE Create_Store_Dialog SHALL disable both the submit button and the cancel button, and display a loading indicator within the submit button
3. WHEN the backend returns a success response (HTTP 201), THE Create_Store_Dialog SHALL close the modal, display a success toast notification that auto-dismisses after 5 seconds, and the Dashboard SHALL re-fetch the user's store list to include the newly created store
4. IF the backend returns a 409 conflict error (domain already exists), THEN THE Create_Store_Dialog SHALL display an inline error message below the domain field indicating the domain is already taken, and the dialog SHALL remain open with form data preserved
5. IF the backend returns a 422 validation error, THEN THE Create_Store_Dialog SHALL map each server-provided field error to the corresponding form field and display the error message adjacent to that field, and the dialog SHALL remain open with form data preserved
6. IF the backend returns a 403 error (store limit reached), THEN THE Create_Store_Dialog SHALL display a general error message above the form fields indicating the user has reached their plan's store limit, and the dialog SHALL remain open
7. IF the backend returns a network error or the request does not receive a response within 10 seconds, THEN THE Create_Store_Dialog SHALL display a general error message above the form fields indicating a connection failure, re-enable the submit and cancel buttons, and preserve the entered form data

### Requirement 5: Subscription Plan Store Limit Enforcement

**User Story:** As a store admin, I want to be informed when I have reached my plan's store limit, so that I understand why I cannot create more stores.

#### Acceptance Criteria

1. WHEN the user's current store count (counting stores with status DRAFT, ACTIVE, or SUSPENDED owned by the user, excluding ARCHIVED and soft-deleted stores) equals or exceeds their subscription plan's max_stores limit, THE Create_Store_Button SHALL be rendered as non-interactive (non-clickable, with aria-disabled attribute set to true and visually styled to indicate the disabled state)
2. WHEN the user hovers over or focuses on a disabled Create_Store_Button, THE Dashboard SHALL display a tooltip indicating that the store limit for the current subscription plan has been reached and suggesting a plan upgrade
3. WHERE the subscription plan has max_stores set to null (unlimited), THE Create_Store_Button SHALL remain enabled regardless of store count
4. IF the user has no active subscription (no StoreSubscription with status ACTIVE or TRIALING), THEN THE Create_Store_Button SHALL be rendered as non-interactive and the tooltip SHALL indicate that an active subscription is required to create stores
5. IF the user attempts to submit a store creation request while their store count equals or exceeds the plan's max_stores limit, THEN THE Dashboard SHALL reject the submission client-side without sending an API request and display an error message indicating the store limit has been reached

### Requirement 6: Dashboard Page Header and Layout Improvement

**User Story:** As a store admin, I want a well-designed dashboard page with a clear header section, so that I can quickly understand my store's status and access key actions.

#### Acceptance Criteria

1. THE Dashboard SHALL display a page header section containing an h1 page title, a welcome message displaying the authenticated user's first name retrieved from auth state, and the Create_Store_Button which navigates the user to the store creation flow
2. IF the user's name is unavailable from auth state, THEN THE Dashboard SHALL display the welcome message without a name (generic greeting only)
3. THE Dashboard page header SHALL be responsive: on viewports below 640px, the title and welcome message SHALL stack above the Create_Store_Button vertically; on viewports 640px and above, the title and welcome message SHALL display on the inline-start side and the Create_Store_Button on the inline-end side horizontally
4. THE Dashboard SHALL maintain the existing statistics cards, sales chart, recent orders, and low-stock alerts sections below the header in their current order
5. THE Dashboard SHALL support both RTL (Arabic) and LTR (English) text direction in all new UI elements by using CSS logical properties (margin-inline, padding-inline) and the dir attribute inherited from the document root

### Requirement 7: Create Store Button on Store Selection Prompt

**User Story:** As a new user with no stores, I want to create my first store directly from the store selection screen, so that I can get started without confusion.

#### Acceptance Criteria

1. WHILE the user has zero stores, THE Store_Selection_Prompt SHALL display a "Create Your First Store" button below the empty state message, rendered as a primary-styled action button visually distinct from surrounding text
2. WHEN the user clicks the "Create Your First Store" button, THE Store_Selection_Prompt SHALL open the Create_Store_Dialog as a modal overlay
3. WHEN a store is successfully created from the Store_Selection_Prompt, THE Store_Admin_Layout SHALL select the newly created store (updating currentStoreId in Redux_Store and persisting to local storage), fetch the user's permissions for that store, and navigate to the dashboard within 1 second of receiving the success response
4. IF the user's current store count equals or exceeds their subscription plan's max_stores limit, THEN THE Store_Selection_Prompt SHALL disable the "Create Your First Store" button and display a message indicating the store limit has been reached
