# Implementation Plan: Phase 6 — Upload System + Webhooks

## Overview

This plan implements the Upload System (image optimization via sharp, local file storage), Webhook System (payment and shipment status updates with HMAC signature verification), and Graceful Shutdown handling. Implementation follows the existing Express.js + Prisma + Zod + TypeScript patterns established in previous phases.

## Tasks

- [x] 1. Install dependencies and create configuration
  - [x] 1.1 Install sharp and create upload/webhook configuration
    - Install `sharp` and `@types/sharp` packages
    - Create `src/configs/upload.config.ts` with upload limits (maxImageSize, maxFileSize, imageQuality, imageMaxWidth, imageMaxHeight, uploadsDir, allowedImageTypes, allowedFileTypes) and webhook provider secrets read from environment variables
    - Add `.env` entries for UPLOAD_MAX_IMAGE_SIZE, UPLOAD_MAX_FILE_SIZE, UPLOAD_IMAGE_QUALITY, UPLOAD_MAX_WIDTH, UPLOAD_MAX_HEIGHT, UPLOADS_DIR, WEBHOOK_PAYMENT_TLYNC_SECRET, WEBHOOK_PAYMENT_TLYNC_HEADER, WEBHOOK_SHIPMENT_SECRET, WEBHOOK_SHIPMENT_HEADER
    - Apply defaults when env vars are not set; fall back to defaults for non-numeric values
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [x] 1.2 Create type definitions
    - Create `src/types/upload.types.ts` with interfaces: UploadResult, ImageUploadOptions, UploadedFile, PaymentWebhookData, ShipmentWebhookData, WebhookProviderConfig
    - _Requirements: 1.5, 2.3, 6.4, 7.4_

- [x] 2. Implement Upload Service
  - [x] 2.1 Create Upload Service with image optimization and file storage
    - Create `src/services/upload.Service.ts`
    - Implement `uploadImage(storeId, file, options?)` — validate mimetype+extension, optimize with sharp (resize within maxWidth×maxHeight, convert to webp, compress at configured quality), write to `uploads/store-{storeId}/images/{uuid}.{format}`, return UploadResult
    - Implement `uploadFile(storeId, file)` — validate mimetype+extension against allowed file types, write to `uploads/store-{storeId}/files/{uuid}.{ext}`, return UploadResult
    - Implement `deleteFile(key, storeId)` — resolve path, verify within uploads dir boundary, verify storeId matches key, unlink file
    - Handle errors: 400 for invalid type/size, 403 for path traversal/store mismatch, 404 for missing file, 422 for sharp failures, 500 for I/O errors
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.2, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.1, 5.2, 5.3_

  - [ ]* 2.2 Write property test for path traversal safety
    - **Property 1: Path Traversal Safety**
    - For any string key provided to deleteFile, the resolved path either starts with the resolved UPLOADS_DIR (and deletion proceeds), or the function rejects with 403 Forbidden
    - **Validates: Requirements 3.2, 3.3**

  - [ ]* 2.3 Write property test for upload key uniqueness
    - **Property 7: Upload Key Uniqueness**
    - For any sequence of file uploads (regardless of identical content, filename, or storeId), every generated file key shall be unique
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 2.4 Write property test for file type validation correctness
    - **Property 8: File Type Validation Correctness**
    - For any file mimetype and extension pair, the validation function accepts the upload if and only if both the mimetype AND extension are in the configured allowed list
    - **Validates: Requirements 1.1, 1.6, 2.1, 2.4**

- [x] 3. Implement Zod validators
  - [x] 3.1 Create upload and webhook Zod validators
    - Create `src/validators/upload.validators.ts` with schemas for image upload options (maxWidth, maxHeight, quality, format) and file key params
    - Create `src/validators/webhook.validators.ts` with PaymentWebhookDataSchema (transaction_reference: non-empty max 255, status: enum, amount: positive, currency: non-empty max 10, optional paid_at ISO 8601, optional metadata) and ShipmentWebhookDataSchema (tracking_number: non-empty max 255, status: non-empty max 50, provider: non-empty max 100, optional date fields, optional metadata)
    - Use `.strip()` to remove unknown fields from webhook payloads
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 4. Checkpoint - Ensure upload service and validators compile
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Webhook Service
  - [x] 5.1 Create Webhook Service with signature verification and status processing
    - Create `src/services/webhook.Service.ts`
    - Implement `verifySignature(rawBody, signature, secret)` — compute HMAC-SHA256, use timingSafeEqual for comparison, handle length mismatch
    - Implement `handlePaymentWebhook(provider, headers, rawBody, parsedBody)` — verify signature, find PaymentTransaction by reference, skip if duplicate status, map status (authorized→AUTHORIZED, captured→CAPTURED, failed→FAILED, refunded→REFUNDED), update transaction + order payment_status + create OrderTimeline entry in a single Prisma transaction
    - Implement `handleShipmentWebhook(provider, headers, rawBody, parsedBody)` — verify signature, find Shipment by tracking_number+provider, skip if same/earlier status, map status to ShipmentStatus enum, update shipment timestamps + order status + create OrderTimeline entry in a single Prisma transaction
    - Implement `mapToOrderPaymentStatus(transactionStatus)` and `mapProviderShipmentStatus(provider, providerStatus)` helper functions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13, 6.14, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ]* 5.2 Write property test for webhook signature verification round-trip
    - **Property 3: Webhook Signature Verification Round-Trip**
    - For any (rawBody, secret) pair, computing HMAC-SHA256(secret, rawBody) and verifying that signature against the same rawBody and secret shall always return true; verifying against a different body or secret shall always return false
    - **Validates: Requirements 6.1, 7.1, 8.1, 8.2**

  - [ ]* 5.3 Write property test for status mapping completeness
    - **Property 6: Status Mapping Completeness**
    - For any provider status string, the mapping function either returns exactly one valid internal enum value, or throws a 400 Bad Request error. No provider status maps to multiple internal values.
    - **Validates: Requirements 6.4, 6.5, 6.12, 7.5, 7.12**

- [x] 6. Implement Controllers
  - [x] 6.1 Create Upload Controller
    - Create `src/controllers/shared/upload.Controller.ts`
    - Configure multer with memory storage and file size limits
    - Implement `uploadImage` handler — apply multer single file middleware, validate file exists, parse options from body, delegate to Upload Service, return 201 with UploadResult
    - Implement `uploadFile` handler — apply multer single file middleware, validate file exists, delegate to Upload Service, return 201 with UploadResult
    - Implement `deleteFile` handler — extract key from route params, delegate to Upload Service, return 200 with confirmation
    - Wrap all handlers with asyncHandler
    - _Requirements: 1.5, 1.9, 2.3, 2.6, 3.1, 4.1, 4.2_

  - [x] 6.2 Create Webhook Controller
    - Create `src/controllers/shared/webhook.Controller.ts`
    - Implement `handlePaymentWebhook` handler — extract provider from params, read raw body, validate payload with Zod schema, delegate to Webhook Service, return 200 `{ received: true }`
    - Implement `handleShipmentWebhook` handler — extract provider from params, read raw body, validate payload with Zod schema, delegate to Webhook Service, return 200 `{ received: true }`
    - Enforce 1MB max body size for webhook endpoints
    - Return 400 with field-level validation errors on Zod failure
    - Wrap all handlers with asyncHandler
    - _Requirements: 6.9, 7.8, 8.4, 8.7, 9.3_

- [x] 7. Implement Raw Body Middleware and Routes
  - [x] 7.1 Create raw body middleware and route files
    - Create `src/middlewares/rawBody.Middleware.ts` — middleware that preserves the raw request body as a Buffer on the request object for webhook signature verification
    - Create `src/routes/upload.routes.ts` — POST /image, POST /file, DELETE /:key(*) with verifyToken + resolveStoreContext middleware
    - Create `src/routes/webhook.routes.ts` — POST /payment/:provider, POST /shipment/:provider with raw body middleware (no auth required)
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7, 8.4_

  - [x] 7.2 Register routes in the main router and add static file serving
    - Add upload routes to `src/routes/index.ts` at `/api/upload`
    - Add webhook routes to `src/routes/index.ts` at `/api/webhooks`
    - Add `express.static()` for the uploads directory at `/uploads` path in `src/index.ts`
    - Ensure webhook routes are registered BEFORE the global JSON body parser (or use route-specific raw body parsing)
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8. Implement Graceful Shutdown
  - [x] 8.1 Create graceful shutdown handler and integrate with server
    - Create `src/utils/gracefulShutdown.ts` — register SIGTERM/SIGINT listeners, stop accepting new connections, wait for in-flight requests (max 30s timeout), disconnect Prisma (5s timeout), exit with code 0 on success or code 1 on timeout/error
    - Update `src/index.ts` to capture the server instance from `app.listen()` and pass it to the graceful shutdown handler
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 9. Checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Property tests for webhook atomicity and image optimization
  - [ ]* 10.1 Write property test for webhook processing atomicity
    - **Property 5: Webhook Processing Atomicity**
    - For any webhook processing operation, either ALL database updates (transaction/shipment status + order status + timeline entry) succeed together, or NONE of them persist
    - **Validates: Requirements 6.7, 7.7**

  - [ ]* 10.2 Write property test for image optimization guarantee
    - **Property 2: Image Optimization Guarantee**
    - For any valid image buffer and any maxWidth/maxHeight configuration, the optimized output dimensions shall never exceed maxWidth × maxHeight, and the output format shall match the configured format
    - **Validates: Requirements 1.2, 1.3**

  - [ ]* 10.3 Write unit tests for webhook and upload integration
    - Test payment webhook end-to-end: create order + payment transaction → POST webhook → verify transaction status updated + timeline entry created
    - Test shipment webhook end-to-end: create order + shipment → POST webhook → verify shipment status updated + order status updated + timeline entry
    - Test upload flow: POST image → verify file exists on disk → DELETE → verify file removed
    - Test duplicate webhook handling (same status returns 200 without mutations)
    - Test backward status transition rejection for shipments
    - _Requirements: 6.10, 7.13, 7.14_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project already has `multer` installed — only `sharp` and `@types/sharp` need to be added
- All webhook endpoints use raw body parsing (not JSON) to preserve bytes for HMAC verification
- Static file serving at `/uploads` is unauthenticated for local development simplicity

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "6.1", "6.2"] },
    { "id": 4, "tasks": ["7.1"] },
    { "id": 5, "tasks": ["7.2", "8.1"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3"] }
  ]
}
```
