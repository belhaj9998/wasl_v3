# Implementation Plan: Store Admin Dashboard — Create Store

## Overview

This plan implements the "Create Store" feature for the Store Admin Dashboard. It covers the Zod validation schema, API service layer, UI components (DashboardHeader, CreateStoreButton, CreateStoreDialog), i18n keys, subscription limit enforcement, and integration into the existing layout and dashboard page. All code is TypeScript with Next.js 15 App Router, shadcn/ui, React Hook Form, Redux Toolkit, and next-intl.

## Tasks

- [x] 1. Create validation schema and API service layer
  - [x] 1.1 Create the store creation Zod validation schema
    - Create `src/lib/validators/store.schema.ts`
    - Define `createStoreSchema` with name (min 2, max 100) and domain (min 3, max 63, regex for lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens)
    - Export `CreateStoreFormData` type inferred from schema
    - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 1.2 Write property test for store name validation (Property 1)
    - **Property 1: Store Name Validation Correctness**
    - Generate arbitrary strings with fast-check, verify acceptance iff `s.length >= 2 && s.length <= 100`
    - **Validates: Requirements 2.2, 3.1, 3.4**

  - [ ]* 1.3 Write property test for store domain validation (Property 2)
    - **Property 2: Store Domain Validation Correctness**
    - Generate arbitrary strings with fast-check, verify acceptance iff all domain rules hold (length 3-63, lowercase alphanumeric + hyphens, no leading/trailing/consecutive hyphens)
    - **Validates: Requirements 2.3, 3.2, 3.3, 3.5, 3.6**

  - [x] 1.4 Create the store API service module
    - Create `src/lib/api/services/store.service.ts`
    - Implement `storeService.create(data)` calling `POST /stores` via apiClient
    - Implement `storeService.getUserSubscriptionInfo()` calling `GET /auth/me/subscription` via apiClient
    - Define TypeScript interfaces for `CreateStoreRequest`, `CreateStoreResponse`, `UserSubscriptionInfo`
    - _Requirements: 4.1, 5.1, 5.3, 5.4_

- [x] 2. Add i18n translation keys
  - [x] 2.1 Add English translation keys for create store feature
    - Add `createStore`, `dashboard`, and `validation` key groups to `messages/en.json`
    - Include all keys defined in the design: button labels, dialog text, error messages, tooltips, validation messages
    - _Requirements: 2.6, 6.1, 6.5_

  - [x] 2.2 Add Arabic translation keys for create store feature
    - Add corresponding Arabic translations to `messages/ar.json`
    - Mirror all English keys with proper Arabic text
    - _Requirements: 2.6, 6.5_

- [x] 3. Implement CreateStoreButton component
  - [x] 3.1 Create the CreateStoreButton component
    - Create `src/components/shared/CreateStoreButton.tsx`
    - Accept props: `variant`, `storeCount`, `maxStores`, `hasActiveSubscription`, `onOpenDialog`
    - Render button with `aria-disabled` when limit reached or no subscription (keep in tab order)
    - Show tooltip on hover/focus when disabled explaining the reason
    - Support `variant="first-store"` for the store selection prompt styling
    - Use `useTranslations` for localized labels
    - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.3, 5.4, 7.1, 7.4_

  - [ ]* 3.2 Write property test for store limit button state (Property 3)
    - **Property 3: Store Limit Button State Correctness**
    - Generate arbitrary tuples of (storeCount: non-negative int, maxStores: positive int | null, hasActiveSubscription: boolean)
    - Verify disabled state matches the rules: disabled when no subscription OR (maxStores !== null AND storeCount >= maxStores)
    - **Validates: Requirements 5.1, 5.3, 5.4, 5.5, 7.4**

  - [ ]* 3.3 Write unit tests for CreateStoreButton
    - Test enabled state renders clickable button
    - Test disabled state renders aria-disabled with tooltip
    - Test variant="first-store" renders correct label
    - Test keyboard accessibility (Tab reachable)
    - _Requirements: 1.4, 5.1, 5.2_

- [x] 4. Implement CreateStoreDialog component
  - [x] 4.1 Create the CreateStoreDialog component
    - Create `src/components/forms/CreateStoreDialog.tsx`
    - Use shadcn/ui Dialog with `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
    - Integrate React Hook Form with `zodResolver(createStoreSchema)`
    - Render name input (label, placeholder, error) and domain input (label, placeholder, hint showing `{domain}.wasl.ly`, error)
    - Render Submit ("Create") and Cancel buttons
    - On submit: call `storeService.create()`, handle 201/409/422/403/5xx/network errors per design error matrix
    - On success: call `onSuccess(newStore)`, close dialog
    - On cancel/Escape: close dialog, reset form
    - Implement 10s AbortController timeout for network requests
    - Display loading state (disable both buttons, spinner in submit button) during submission
    - Preserve form data on error; map server field errors via `setError()`
    - Focus management: first input on open, return to trigger on close
    - Use CSS logical properties for RTL support
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 4.2 Write unit tests for CreateStoreDialog
    - Test dialog renders with all fields and buttons
    - Test cancel closes dialog and resets form
    - Test submit with valid data calls API
    - Test 409 error shows inline domain error
    - Test 422 error maps to form fields
    - Test 403 error shows general error banner
    - Test 5xx/network error shows general error and preserves data
    - Test loading state disables buttons
    - Test success closes dialog and calls onSuccess
    - _Requirements: 2.7, 2.8, 2.9, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement DashboardHeader component
  - [x] 6.1 Create the DashboardHeader component
    - Create `src/components/layouts/DashboardHeader.tsx`
    - Accept props: `userName`, `storeCount`, `maxStores`, `hasActiveSubscription`, `onStoreCreated`
    - Render h1 page title, welcome message (with or without name), and CreateStoreButton
    - Manage CreateStoreDialog open state internally
    - Responsive layout: stack vertically below 640px, horizontal above 640px
    - Use CSS logical properties for RTL support
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 6.2 Write unit tests for DashboardHeader
    - Test renders welcome message with name
    - Test renders generic welcome message when name is null
    - Test responsive layout classes
    - Test CreateStoreButton receives correct props
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Integrate into Dashboard page and StoreAdminLayout
  - [x] 7.1 Add subscription info fetching to StoreAdminLayout
    - Modify `src/app/(store-admin)/layout.tsx`
    - Fetch subscription info (maxStores, hasActiveSubscription) alongside store list
    - Compute `storeCount` from stores excluding ARCHIVED and soft-deleted
    - Pass subscription data to children via props or context
    - _Requirements: 5.1, 5.3, 5.4_

  - [x] 7.2 Integrate DashboardHeader into the Dashboard page
    - Modify `src/app/(store-admin)/admin/dashboard/page.tsx`
    - Add `DashboardHeader` above existing stats cards section
    - Pass userName from auth state, storeCount, maxStores, hasActiveSubscription
    - On store created: re-fetch store list, show success toast (auto-dismiss 5s)
    - Maintain existing stats cards, sales chart, recent orders, and low-stock alerts below header
    - _Requirements: 1.1, 1.3, 4.3, 6.1, 6.4_

  - [x] 7.3 Add CreateStoreButton to StoreSelectionPrompt
    - Modify the store selection prompt section in `src/app/(store-admin)/layout.tsx`
    - Add CreateStoreButton with `variant="first-store"` in empty state
    - On store created from prompt: set currentStoreId in Redux, persist to localStorage, fetch permissions, navigate to dashboard
    - Disable button when store limit reached
    - _Requirements: 1.2, 7.1, 7.2, 7.3, 7.4_

  - [x] 7.4 Implement client-side store limit guard on submission
    - In CreateStoreDialog or parent, check store count vs maxStores before API call
    - If limit reached, reject submission client-side with error message (no API request sent)
    - _Requirements: 5.5_

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Integration and accessibility verification
  - [ ]* 9.1 Write integration tests for create store flow
    - Test full flow: open dialog → fill form → submit → verify store list updated
    - Test creation from StoreSelectionPrompt → auto-selects new store → navigates to dashboard
    - Test API error handling end-to-end with mocked responses
    - _Requirements: 2.7, 4.3, 7.3_

  - [ ]* 9.2 Write accessibility unit tests
    - Test aria-disabled on CreateStoreButton when limit reached
    - Test dialog has role="dialog", aria-modal, aria-labelledby
    - Test error messages linked via aria-describedby
    - Test focus management (first input on open, return to trigger on close)
    - Test keyboard navigation (Tab, Escape)
    - _Requirements: 1.4, 5.1_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend store creation endpoint (`POST /stores`) already exists — this plan is frontend-only
- All components use CSS logical properties for RTL/LTR support
- i18n keys must be added before components that reference them

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4", "2.1", "2.2"] },
    { "id": 1, "tasks": ["1.2", "1.3", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1"] },
    { "id": 3, "tasks": ["4.2", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["9.1", "9.2"] }
  ]
}
```
