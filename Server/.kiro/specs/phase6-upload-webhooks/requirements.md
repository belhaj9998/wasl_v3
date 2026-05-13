# Requirements Document

## Introduction

Phase 6 adds a reusable Upload System for image and file management with sharp-based optimization, a Webhook System for receiving payment and shipment status updates from external providers, and Graceful Shutdown handling for clean process termination. All systems are designed for local development and testing — files are stored on the local filesystem, and webhooks are tested via manual HTTP calls.

## Glossary

- **Upload_Service**: The service component responsible for file validation, image optimization, local storage, and file deletion
- **Upload_Controller**: Express route handlers for upload endpoints that integrate multer and delegate to Upload_Service
- **Webhook_Controller**: Express route handlers that receive incoming webhook payloads, validate signatures, and delegate processing
- **Webhook_Validator**: The component that verifies HMAC-SHA256 webhook signatures using timing-safe comparison
- **Graceful_Shutdown_Handler**: The utility that listens for SIGTERM/SIGINT signals and performs clean process termination
- **Sharp_Optimizer**: The sharp library integration that resizes, compresses, and converts images
- **Local_Storage**: The local filesystem storage layer using the `uploads/` directory
- **OrderTimeline**: The database model that logs order-related events for audit purposes
- **PaymentTransaction**: The database model representing a payment attempt linked to an order
- **Shipment**: The database model representing a shipping record linked to an order
- **Multer**: Express middleware for handling multipart/form-data file uploads

## Requirements

### Requirement 1: Image Upload

**User Story:** As a store administrator, I want to upload images that are automatically optimized, so that my store has fast-loading, high-quality visuals without manual image processing.

#### Acceptance Criteria

1. WHEN a valid image file is uploaded via POST /api/upload/image, THE Upload_Service SHALL validate the file mimetype and extension against the allowed image types list (jpg, png, webp, gif) before any processing begins
2. WHEN a valid image file passes validation, THE Sharp_Optimizer SHALL resize the image to fit within the configured maximum dimensions (default 1920×1920) without enlargement
3. WHEN a valid image file passes validation, THE Sharp_Optimizer SHALL compress and convert the image to the specified output format (default webp) at the configured quality level (default 80)
4. WHEN image optimization completes, THE Upload_Service SHALL store the optimized file at the path `uploads/store-{storeId}/images/{uuid}.{format}` creating directories as needed
5. WHEN image upload succeeds, THE Upload_Controller SHALL return a 201 response containing the file key, relative URL, original filename, final mimetype, and final file size
6. WHEN an uploaded image file has an unsupported mimetype or extension, THE Upload_Service SHALL immediately halt the upload process and reject with a 400 Bad Request error specifying the allowed types
7. WHEN an uploaded image file exceeds the configured maximum image size (default 5MB), THE Upload_Service SHALL reject the upload with a 400 Bad Request error specifying the size limit
8. IF sharp cannot process the image buffer due to corruption or unsupported format, THEN THE Upload_Service SHALL return a 422 Unprocessable Entity error with a descriptive message
9. IF the upload request contains no file or the file field is empty, THEN THE Upload_Service SHALL return a 400 Bad Request error indicating that a file is required without attempting any validation
10. IF the filesystem cannot store the file due to permissions or I/O errors, THEN THE Upload_Service SHALL return a 500 Internal Server Error

### Requirement 2: General File Upload

**User Story:** As a store administrator, I want to upload general files (documents, PDFs), so that I can attach non-image assets to my store content.

#### Acceptance Criteria

1. WHEN a valid file is uploaded via POST /api/upload/file, THE Upload_Service SHALL validate the file mimetype and extension against the allowed file types list (default: pdf, doc, docx, xls, xlsx, csv, txt, zip)
2. WHEN a valid file passes validation, THE Upload_Service SHALL store the file at the path `uploads/store-{storeId}/files/{uuid}.{ext}` creating directories as needed
3. WHEN file upload succeeds, THE Upload_Controller SHALL return a 201 response containing the file key, relative URL, original filename, mimetype, and file size
4. WHEN an uploaded file has an unsupported mimetype or extension, THE Upload_Service SHALL reject the upload with a 400 Bad Request error specifying the allowed types
5. WHEN an uploaded file exceeds the configured maximum file size (default 10MB), THE Upload_Service SHALL reject the upload with a 400 Bad Request error specifying the size limit
6. IF the upload request contains no file or the file field is empty, THEN THE Upload_Service SHALL skip validation entirely and return a 400 Bad Request error indicating that a file is required
7. IF the filesystem cannot store the file due to permissions or I/O errors, THEN THE Upload_Service SHALL return a 500 Internal Server Error

### Requirement 3: File Deletion

**User Story:** As a store administrator, I want to delete previously uploaded files, so that I can remove outdated or incorrect assets from my store.

#### Acceptance Criteria

1. WHEN a DELETE request is received for a valid file key, THE Upload_Service SHALL remove the file from the local filesystem and THE Upload_Controller SHALL return a 200 OK response confirming the deletion
2. WHEN a DELETE request is received, THE Upload_Service SHALL resolve the full path by joining the configured uploads directory with the provided file key and verify the resolved path remains within the uploads directory boundary
3. IF the resolved file path escapes the uploads directory (path traversal attempt), THEN THE Upload_Service SHALL reject the request with a 403 Forbidden error
4. IF the file specified by the key does not exist on disk, THEN THE Upload_Service SHALL return a 404 Not Found error
5. IF the filesystem cannot delete the file due to permissions or I/O errors, THEN THE Upload_Service SHALL return a 500 Internal Server Error
6. IF the file key does not match the expected key format (store-{storeId}/{type}/{filename}), THEN THE Upload_Service SHALL reject the request with a 400 Bad Request error
7. IF the storeId in the file key does not match the authenticated user's target store, THEN THE Upload_Service SHALL reject the request with a 403 Forbidden error

### Requirement 4: Upload Authentication and Authorization

**User Story:** As a platform operator, I want upload endpoints to require authentication and store membership, so that only authorized users can upload or delete files.

#### Acceptance Criteria

1. THE Upload_Controller SHALL apply the verifyToken middleware followed by the resolveStoreContext middleware to all upload and delete endpoints, identifying the target store from the x-store-id request header
2. THE Upload_Controller SHALL verify the authenticated user has a StoreMembership with status ACTIVE in the target store and that the store status is ACTIVE or DRAFT
3. IF the request lacks an authentication token or the token is invalid or expired, THEN THE Upload_Controller SHALL return a 401 Unauthorized error
4. IF the authenticated user does not have a StoreMembership in the target store, THEN THE Upload_Controller SHALL return a 403 Forbidden error
5. IF the authenticated user's membership status is not ACTIVE (INVITED or SUSPENDED), THEN THE Upload_Controller SHALL return a 403 Forbidden error indicating the membership is not active
6. IF the target store status is SUSPENDED or ARCHIVED, THEN THE Upload_Controller SHALL return a 403 Forbidden error indicating the store is not accessible
7. IF the x-store-id header is missing or not a valid positive integer, THEN THE Upload_Controller SHALL return a 400 Bad Request error

### Requirement 5: Upload Key Uniqueness

**User Story:** As a developer, I want each upload to produce a unique file key, so that files never overwrite each other regardless of the original filename.

#### Acceptance Criteria

1. THE Upload_Service SHALL generate a UUID v4 filename for every uploaded file, excluding the original filename from the stored path
2. WHEN two files with identical content and identical original filenames are uploaded, THE Upload_Service SHALL produce different UUID-based keys and store them as separate files on disk
3. THE Upload_Service SHALL construct the file key in the format `{uuid}.{extension}` where the extension is determined by the output format for images or the original file extension for general files

### Requirement 6: Payment Webhook Processing

**User Story:** As a store operator, I want to receive payment status updates from payment providers via webhooks, so that order payment states are automatically kept in sync.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/webhooks/payment/:provider, THE Webhook_Controller SHALL verify the request signature using HMAC-SHA256 with the provider-specific secret
2. WHEN signature verification succeeds, THE Webhook_Controller SHALL validate the payload against the payment webhook Zod schema
3. WHEN a valid payment webhook is received, THE Webhook_Controller SHALL locate the PaymentTransaction by transaction_reference
4. WHEN the PaymentTransaction is found and its current status differs from the mapped incoming status, THE Webhook_Controller SHALL update the PaymentTransaction status to the mapped internal status (AUTHORIZED, CAPTURED, FAILED, or REFUNDED) and store the webhook payload in the raw_payload field
5. WHEN the PaymentTransaction status is updated to CAPTURED, THE Webhook_Controller SHALL set the PaymentTransaction paid_at timestamp to the current date-time
6. WHEN the PaymentTransaction is updated, THE Webhook_Controller SHALL update the associated Order payment_status accordingly (AUTHORIZED→PENDING, CAPTURED→PAID, FAILED→FAILED, REFUNDED→REFUNDED)
7. WHEN the payment webhook is processed, THE Webhook_Controller SHALL create an OrderTimeline entry with event set to "payment_status_changed", the previous and new payment status recorded in the payload JSON field, and note indicating the provider name
8. WHEN all payment webhook updates succeed, THE Webhook_Controller SHALL execute them within a single database transaction ensuring atomicity
9. WHEN payment webhook processing completes successfully (after database transaction commits), THE Webhook_Controller SHALL return a 200 OK response with `{ received: true }`
10. IF the PaymentTransaction already has the same status as the mapped incoming status (duplicate webhook), THEN THE Webhook_Controller SHALL skip all database mutations and return a 200 OK response with `{ received: true }`
11. IF the webhook signature is invalid or missing, THEN THE Webhook_Controller SHALL return a 401 Unauthorized error without performing any database mutations
12. IF the transaction_reference does not match any PaymentTransaction, THEN THE Webhook_Controller SHALL return a 404 Not Found error
13. IF the provider name is not registered in configuration, THEN THE Webhook_Controller SHALL return a 404 Not Found error
14. IF the payment status value cannot be mapped to an internal enum, THEN THE Webhook_Controller SHALL return a 400 Bad Request error

### Requirement 7: Shipment Webhook Processing

**User Story:** As a store operator, I want to receive shipment status updates from shipping carriers via webhooks, so that order and shipment states are automatically kept in sync.

#### Acceptance Criteria

1. WHEN a POST request is received at /api/webhooks/shipment/:provider, THE Webhook_Controller SHALL verify the request signature using HMAC-SHA256 with the provider-specific secret
2. WHEN signature verification succeeds, THE Webhook_Controller SHALL validate the payload against the shipment webhook Zod schema
3. WHEN a valid shipment webhook is received, THE Webhook_Controller SHALL locate the Shipment by matching both tracking_number and provider fields exactly
4. WHEN the Shipment is found and the new status differs from the current Shipment status, THE Webhook_Controller SHALL update the Shipment status and set timestamps as follows: shipped_at when status becomes SHIPPED, delivered_at when status becomes DELIVERED, and expected_delivery_at only when the payload includes an expected delivery date
5. WHEN the Shipment is updated, THE Webhook_Controller SHALL update the associated Order status to the same ShipmentStatus value applied to the Shipment
6. WHEN the shipment webhook is processed, THE Webhook_Controller SHALL create an OrderTimeline entry recording the shipment event with from_status set to the previous ShipmentStatus and to_status set to the new ShipmentStatus
7. WHEN all shipment webhook updates succeed, THE Webhook_Controller SHALL execute them within a single database transaction ensuring atomicity
8. WHEN shipment webhook processing completes successfully (after database transaction commits), THE Webhook_Controller SHALL return a 200 OK response with `{ received: true }`
9. IF the webhook signature is invalid or missing, THEN THE Webhook_Controller SHALL return a 401 Unauthorized error without performing any database mutations
10. IF the tracking_number does not match any Shipment for the given provider, THEN THE Webhook_Controller SHALL return a 404 Not Found error
11. IF the provider name is not registered in configuration, THEN THE Webhook_Controller SHALL return a 404 Not Found error
12. IF the shipment status value cannot be mapped to an internal ShipmentStatus enum, THEN THE Webhook_Controller SHALL return a 400 Bad Request error
13. IF the incoming shipment status is identical to the current Shipment status, THEN THE Webhook_Controller SHALL return a 200 OK response with `{ received: true }` without performing any database mutations
14. IF the webhook payload contains a status that represents an earlier lifecycle stage than the current Shipment status (based on ShipmentStatus enum ordinal position), THEN THE Webhook_Controller SHALL ignore the update and return a 200 OK response with `{ received: true }`

### Requirement 8: Webhook Signature Security

**User Story:** As a platform operator, I want webhook signatures verified using timing-safe comparison, so that the system is protected against both forgery and timing attacks.

#### Acceptance Criteria

1. THE Webhook_Validator SHALL compute the expected signature as HMAC-SHA256(secret, rawBody) encoded as lowercase hexadecimal
2. WHEN the provided signature and expected signature are equal in byte length, THE Webhook_Validator SHALL compare them using timing-safe comparison (crypto.timingSafeEqual) and return the match result
3. IF the provided signature length differs from the expected signature length, THEN THE Webhook_Validator SHALL reject the signature as invalid without exposing length information through timing differences
4. THE Webhook_Controller SHALL preserve the raw request body (using express.raw() middleware) for accurate signature verification before JSON parsing
5. THE Webhook_Controller SHALL read the signature from the provider-specific HTTP header configured for each provider
6. IF the configured signature header is missing or empty in the incoming request, THEN THE Webhook_Controller SHALL reject the request with a 401 Unauthorized error without performing signature computation
7. THE Webhook_Controller SHALL enforce a maximum raw body size of 1MB for webhook endpoints, rejecting payloads that exceed this limit with a 413 Payload Too Large error regardless of other validation checks (size check takes priority over signature verification)

### Requirement 9: Webhook Payload Validation

**User Story:** As a developer, I want webhook payloads validated against Zod schemas, so that malformed data is rejected before processing.

#### Acceptance Criteria

1. WHEN a payment webhook payload is received, THE Webhook_Controller SHALL validate it against the PaymentWebhookData Zod schema requiring: transaction_reference (non-empty string, max 255 characters), status (one of "authorized", "captured", "failed", "refunded"), amount (positive number greater than 0), and currency (non-empty string, max 10 characters), with optional fields paid_at (ISO 8601 date string) and metadata (object)
2. WHEN a shipment webhook payload is received, THE Webhook_Controller SHALL validate it against the ShipmentWebhookData Zod schema requiring: tracking_number (non-empty string, max 255 characters), status (non-empty string, max 50 characters), and provider (non-empty string, max 100 characters), with optional fields shipped_at, delivered_at, and expected_delivery_at (ISO 8601 date strings) and metadata (object)
3. IF the webhook payload fails Zod validation for a recognized webhook type (payment or shipment), THEN THE Webhook_Controller SHALL return a 400 Bad Request error response containing an array of field-level validation errors, where each error identifies the field path and the reason for failure
4. IF the webhook payload contains unexpected fields not defined in the schema, THEN THE Webhook_Controller SHALL strip the unknown fields and proceed with validation of the defined fields only

### Requirement 10: Graceful Shutdown

**User Story:** As a developer, I want the server to shut down gracefully on SIGTERM/SIGINT, so that in-flight requests complete and database connections close cleanly.

#### Acceptance Criteria

1. WHEN the process receives a SIGTERM or SIGINT signal, THE Graceful_Shutdown_Handler SHALL stop the HTTP server from accepting new connections
2. WHEN the HTTP server stops accepting connections, THE Graceful_Shutdown_Handler SHALL wait for existing in-flight requests to complete within a maximum timeout of 30 seconds, or proceed immediately to database disconnection if there are no in-flight requests
3. WHEN all in-flight requests complete or the 30-second timeout elapses (whichever comes first), THE Graceful_Shutdown_Handler SHALL disconnect the Prisma client from the database with a 5-second disconnection timeout
4. WHEN all cleanup completes successfully, THE Graceful_Shutdown_Handler SHALL exit the process with code 0
5. IF the shutdown timeout elapses before all in-flight requests complete, THEN THE Graceful_Shutdown_Handler SHALL force-close remaining connections and exit the process with code 1
6. IF an error occurs during Prisma client disconnection or the 5-second disconnection timeout elapses, THEN THE Graceful_Shutdown_Handler SHALL log the error and force-exit the process with code 1
7. THE Graceful_Shutdown_Handler SHALL register signal listeners for SIGTERM and SIGINT when the server starts

### Requirement 11: Static File Serving

**User Story:** As a developer, I want uploaded files served via express.static() in local development, so that uploaded images and files are accessible via their URL paths.

#### Acceptance Criteria

1. WHILE the server is running in local development mode, THE Upload_Controller SHALL configure express.static() to serve the configured uploads directory at the `/uploads` URL path
2. WHEN a GET request is made to a valid `/uploads/{key}` path where the file exists on disk and is readable, THE server SHALL return the file content with the content type determined by the file extension
3. IF a GET request is made to a `/uploads/{key}` path where the file does not exist on disk or is unreadable due to permissions or corruption, THEN THE server SHALL return a 404 Not Found response
4. THE Upload_Controller SHALL serve static files without requiring authentication, allowing public read access to uploaded assets via their URL paths

### Requirement 12: Upload Configuration

**User Story:** As a developer, I want upload limits and settings configurable via environment variables, so that I can adjust behavior without code changes.

#### Acceptance Criteria

1. THE Upload_Service SHALL read maximum image size (default 5MB), maximum file size (default 10MB), image quality (default 80, range 1-100), and maximum image dimensions width and height (default 1920×1920 pixels) from environment variables, applying the specified defaults when variables are not set
2. THE Upload_Service SHALL read the uploads directory path from an environment variable, defaulting to `./uploads` relative to the project root when not set
3. THE Upload_Service SHALL read allowed image types and allowed file types from environment variables as comma-separated mimetype lists, defaulting to `image/jpeg,image/png,image/webp,image/gif` for images and `application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document` for files when not set
4. THE Webhook_Controller SHALL read provider secrets and signature header names from environment variables using a per-provider naming convention, and SHALL reject webhook requests for any provider whose secret is not configured or is empty
5. IF a configured numeric environment variable contains a non-numeric value, THEN THE Upload_Service SHALL fall back to the default value for that setting
6. WHEN the application starts, THE Upload_Service SHALL use the configured uploads directory path for all file storage operations without requiring a restart to apply changes made before startup
