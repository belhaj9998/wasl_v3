# Requirements Document

## Introduction

Phase 3 of Wasl SaaS implements the full Product Catalog system for the multi-store e-commerce platform. This includes hierarchical category management with tree structures, complete product CRUD with publishing workflows and status transitions, product options and variant generation (cartesian product), inventory tracking with movement history and low-stock alerts, and product media management. All endpoints are scoped to a specific store via the existing `resolveStoreContext` middleware (using the `x-store-id` header) and protected by the `requirePermission` middleware for RBAC enforcement. The system is built on Express + Prisma + PostgreSQL with Zod validation and TypeScript.

## Glossary

- **Category_Service**: The service responsible for CRUD operations on categories, tree structure management, slug generation, reordering, and depth validation.
- **Product_Service**: The service responsible for product CRUD, status transitions, publishing/unpublishing, duplication, filtered listing with pagination, and full-text search.
- **Product_Option_Service**: The service responsible for managing product options (e.g., Size, Color) and their values (e.g., S/M/L, Red/Blue) per product.
- **Product_Variant_Service**: The service responsible for variant CRUD, bulk generation via cartesian product of option values, SKU/barcode uniqueness enforcement, and default variant management.
- **Inventory_Service**: The service responsible for viewing inventory levels, performing adjustments with movement recording, low-stock alerts, and movement history.
- **Product_Media_Service**: The service responsible for uploading product media, updating alt text, reordering, and deleting media files.
- **Category**: A hierarchical grouping entity with tree structure (max 3 levels deep), scoped by store_id, with unique slug per store.
- **Product**: A sellable item with status lifecycle (DRAFT → ACTIVE → ARCHIVED), pricing, and publishing state, scoped by store_id.
- **ProductVariant**: A specific purchasable configuration of a product defined by option value combinations, with unique SKU per store.
- **ProductOption**: A configurable dimension of a product (e.g., Color, Size) with ordered values.
- **ProductOptionValue**: A specific value within an option (e.g., Red, Large).
- **Inventory**: A stock record per variant tracking total, available, and reserved quantities with the invariant: available = total - reserved.
- **InventoryMovement**: An audit record of each inventory change including type, quantity, actor, and reason.
- **ProductMedia**: An image or media file associated with a product, with alt text and sort ordering.
- **Resolve_Store_Context**: The existing middleware that extracts store_id from the x-store-id header, validates the user's active membership, checks store status (ACTIVE or DRAFT), and loads the user's permission codes into the request.
- **Require_Permission**: The existing middleware that checks whether the authenticated user's loaded permissions include the required permission code before allowing access to the endpoint.

---

## Requirements

### Requirement 1: List Categories

**User Story:** As a store admin, I want to list all categories in my store, so that I can view the category hierarchy and manage product organization.

#### Acceptance Criteria

1. WHEN an authenticated member with category:view permission requests the category list, THE Category_Service SHALL return the list of categories for the current store supporting both flat list and tree structure modes via a `flat` query parameter.
2. WHEN the flat parameter is set to "false" or omitted, THE Category_Service SHALL return categories as a nested tree structure with each node containing a `children` array sorted by sort_order.
3. WHEN the flat parameter is set to "true", THE Category_Service SHALL return categories as a flat paginated list with page (default 1) and limit (default 20, max 100) parameters.
4. WHEN a parent_id query parameter is provided, THE Category_Service SHALL filter categories to only those with the specified parent_id.
5. WHEN an is_active query parameter is provided, THE Category_Service SHALL filter categories by their active status.
6. IF the authenticated user does not have the category:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error with the message "You don't have category:view permission".

### Requirement 2: Create Category

**User Story:** As a store admin, I want to create new categories, so that I can organize products into a logical hierarchy.

#### Acceptance Criteria

1. WHEN an authenticated member with category:create permission submits a valid category creation request, THE Category_Service SHALL create a new Category record with an auto-generated slug and return the created record with a 201 status.
2. THE Category_Service SHALL validate the creation request using a Zod schema requiring name (2-100 characters) and allowing optional parent_id (positive integer or null), optional image_url (valid URL, max 2048 characters), and optional is_active (boolean, default true).
3. THE Category_Service SHALL auto-generate the slug from the name by converting to lowercase, replacing spaces and special characters with hyphens, and removing non-URL-safe characters.
4. IF a category with the same slug already exists in the current store, THEN THE Category_Service SHALL append a numeric suffix to ensure uniqueness (e.g., "t-shirt-2", "t-shirt-3").
5. IF the specified parent_id does not reference an existing category in the same store, THEN THE Category_Service SHALL return a 404 Not Found error with the message "Parent category not found".
6. IF creating the category would exceed the maximum tree depth of 3 levels, THEN THE Category_Service SHALL return a 400 Bad Request error with the message "Maximum category depth (3 levels) exceeded".
7. THE Category_Service SHALL set the sort_order to max(sort_order) + 1 among sibling categories (categories with the same parent_id).
8. IF the authenticated user does not have the category:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
9. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 3: Get Category by ID

**User Story:** As a store admin, I want to view a specific category's details, so that I can review or edit its configuration.

#### Acceptance Criteria

1. WHEN an authenticated member with category:view permission requests a specific category by ID, THE Category_Service SHALL return the Category record including id, store_id, name, slug, parent_id, image_url, sort_order, is_active, created_at, and updated_at.
2. IF the specified category ID does not exist within the current store, THEN THE Category_Service SHALL return a 404 Not Found error with the message "Category not found".
3. IF the authenticated user does not have the category:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 4: Update Category

**User Story:** As a store admin, I want to update a category's name, parent, image, or active status, so that I can maintain an accurate category structure.

#### Acceptance Criteria

1. WHEN an authenticated member with category:update permission submits a valid update request for an existing category, THE Category_Service SHALL update the Category record with the provided fields and return the updated record.
2. THE Category_Service SHALL validate the update request using a Zod schema allowing optional name (2-100 characters), optional parent_id (positive integer or null), optional image_url (valid URL, max 2048 characters or null), and optional is_active (boolean).
3. WHEN the name is updated, THE Category_Service SHALL regenerate the slug from the new name and ensure uniqueness within the store.
4. IF the new parent_id would create a circular reference (setting parent to itself or one of its descendants), THEN THE Category_Service SHALL return a 400 Bad Request error with the message "Cannot set parent: would create circular reference".
5. IF the new parent_id would cause the category or its subtree to exceed the maximum depth of 3 levels, THEN THE Category_Service SHALL return a 400 Bad Request error with the message "Maximum category depth (3 levels) exceeded".
6. IF the specified category ID does not exist within the current store, THEN THE Category_Service SHALL return a 404 Not Found error.
7. IF the authenticated user does not have the category:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
8. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 5: Delete Category

**User Story:** As a store admin, I want to delete a category, so that I can remove unused categories from my store.

#### Acceptance Criteria

1. WHEN an authenticated member with category:delete permission submits a deletion request for an existing category, THE Category_Service SHALL delete the Category record and return a 200 success response.
2. WHEN a category with children is deleted, THE Category_Service SHALL reassign all child categories to the deleted category's parent (or to root if the deleted category had no parent).
3. WHEN a category with product assignments is deleted, THE Category_Service SHALL allow the deletion and cascade-delete the ProductCategory link records (products remain intact).
4. IF the specified category ID does not exist within the current store, THEN THE Category_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the category:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 6: Reorder Categories

**User Story:** As a store admin, I want to reorder categories and move them within the tree, so that I can control the display order and hierarchy.

#### Acceptance Criteria

1. WHEN an authenticated member with category:update permission submits a valid reorder request, THE Category_Service SHALL update the sort_order (and optionally parent_id) for each specified category in a single atomic transaction.
2. THE Category_Service SHALL validate the reorder request using a Zod schema requiring an items array (1-500 items) where each item has id (positive integer), sort_order (non-negative integer), and optional parent_id (positive integer or null).
3. IF any item ID does not reference an existing category in the current store, THEN THE Category_Service SHALL return a 400 Bad Request error.
4. IF any parent_id change would create a circular reference, THEN THE Category_Service SHALL return a 400 Bad Request error with the message "Cannot set parent: would create circular reference".
5. IF any parent_id change would exceed the maximum tree depth of 3 levels, THEN THE Category_Service SHALL return a 400 Bad Request error with the message "Maximum category depth (3 levels) exceeded".
6. IF the authenticated user does not have the category:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.


### Requirement 7: List Products

**User Story:** As a store admin, I want to list products with filtering, sorting, and search capabilities, so that I can efficiently find and manage my product catalog.

#### Acceptance Criteria

1. WHEN an authenticated member with product:view permission requests the product list, THE Product_Service SHALL return a paginated list of products with page (default 1) and limit (default 20, max 100) parameters.
2. WHEN a status filter parameter is provided, THE Product_Service SHALL filter results by the specified ProductStatus (DRAFT, ACTIVE, ARCHIVED).
3. WHEN a category_id filter parameter is provided, THE Product_Service SHALL filter results to products assigned to the specified category.
4. WHEN min_price and/or max_price filter parameters are provided, THE Product_Service SHALL filter results by base_price within the specified range.
5. WHEN a search parameter is provided, THE Product_Service SHALL filter results by matching the search term against product name, description, short_description, and variant SKUs using case-insensitive partial matching.
6. WHEN sort_by and sort_order parameters are provided, THE Product_Service SHALL sort results by the specified field (name, price, created_at, updated_at) in the specified direction (asc, desc), defaulting to created_at desc.
7. WHEN an is_published filter parameter is provided, THE Product_Service SHALL filter results by their published status.
8. THE Product_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
9. THE Product_Service SHALL include the first media image and at least one active variant in the response for each product.
10. IF the authenticated user does not have the product:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
11. WHEN validation of query parameters fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 8: Create Product

**User Story:** As a store admin, I want to create new products, so that I can add items to my store's catalog.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a valid product creation request, THE Product_Service SHALL create a new Product record with status set to DRAFT and is_published set to false, and return the created record with a 201 status.
2. THE Product_Service SHALL validate the creation request using a Zod schema requiring name (2-200 characters) and base_price (positive number), and allowing optional description (max 5000 characters), optional short_description (max 500 characters), optional compare_at_price (positive number), optional cost_price (non-negative number), optional track_inventory (boolean, default true), optional has_variants (boolean, default false), and optional category_ids (array of positive integers).
3. THE Product_Service SHALL auto-generate the slug from the name and ensure uniqueness within the store by appending numeric suffixes if needed.
4. IF compare_at_price is provided, THE Product_Service SHALL validate that compare_at_price is greater than base_price, returning a 422 error if not.
5. IF category_ids are provided, THE Product_Service SHALL validate that all category IDs exist in the current store, returning a 400 Bad Request error with the message "One or more category IDs are invalid" if any do not exist.
6. WHEN has_variants is false, THE Product_Service SHALL auto-create a default ProductVariant with SKU derived from the product slug, is_default set to true, and an associated Inventory record with all quantities set to 0.
7. THE Product_Service SHALL create ProductCategory join records for each provided category_id.
8. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
9. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 9: Get Product by ID

**User Story:** As a store admin, I want to view a specific product's full details including its categories, options, variants, and media, so that I can review or edit the product.

#### Acceptance Criteria

1. WHEN an authenticated member with product:view permission requests a specific product by ID, THE Product_Service SHALL return the Product record with all related data including categories, options with values, variants with option values, media sorted by sort_order, and inventory data.
2. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error with the message "Product not found".
3. IF the authenticated user does not have the product:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 10: Update Product

**User Story:** As a store admin, I want to update product details such as name, pricing, description, and category assignments, so that I can keep product information accurate.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid update request for an existing product, THE Product_Service SHALL update the Product record with the provided fields and return the updated record.
2. THE Product_Service SHALL validate the update request using a Zod schema allowing optional name (2-200 characters), optional description (max 5000 characters or null), optional short_description (max 500 characters or null), optional base_price (positive number), optional compare_at_price (positive number or null), optional cost_price (non-negative number or null), optional track_inventory (boolean), and optional category_ids (array of positive integers).
3. WHEN the name is updated, THE Product_Service SHALL regenerate the slug from the new name and ensure uniqueness within the store.
4. WHEN category_ids are provided, THE Product_Service SHALL replace all existing ProductCategory links with the new set of category_ids.
5. IF any provided category_id does not exist in the current store, THEN THE Product_Service SHALL return a 400 Bad Request error.
6. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error.
7. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
8. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 11: Delete Product

**User Story:** As a store admin, I want to delete a product, so that I can remove items that are no longer sold.

#### Acceptance Criteria

1. WHEN an authenticated member with product:delete permission submits a deletion request for an existing product, THE Product_Service SHALL delete the Product record and all related entities (variants, options, option values, media, inventory, category links) via cascade and return a 200 success response.
2. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 12: Update Product Status

**User Story:** As a store admin, I want to change a product's status (DRAFT, ACTIVE, ARCHIVED), so that I can control the product lifecycle.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid status update request, THE Product_Service SHALL update the product's status and return the updated record.
2. THE Product_Service SHALL validate the status update request using a Zod schema requiring status (one of: DRAFT, ACTIVE, ARCHIVED).
3. THE Product_Service SHALL enforce valid status transitions: DRAFT → ACTIVE, ACTIVE → ARCHIVED, and ARCHIVED → DRAFT.
4. IF the requested status transition is invalid (e.g., DRAFT → ARCHIVED directly), THEN THE Product_Service SHALL return a 400 Bad Request error with the message "Invalid status transition from {current} to {requested}".
5. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 13: Publish/Unpublish Product

**User Story:** As a store admin, I want to publish or unpublish a product, so that I can control its visibility on the storefront.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a publish request with publish set to true, THE Product_Service SHALL set is_published to true and published_at to the current timestamp, and return the updated record.
2. WHEN an authenticated member with product:update permission submits a publish request with publish set to false, THE Product_Service SHALL set is_published to false (published_at remains unchanged for historical reference) and return the updated record.
3. THE Product_Service SHALL validate the publish request using a Zod schema requiring publish (boolean).
4. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 14: Duplicate Product

**User Story:** As a store admin, I want to duplicate an existing product with all its options, variants, and media, so that I can quickly create similar products.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a duplication request for an existing product, THE Product_Service SHALL create a complete clone of the product and return the new product with a 201 status.
2. THE Product_Service SHALL set the duplicated product's name to "{original name} (Copy)" and generate a unique slug based on the new name.
3. THE Product_Service SHALL set the duplicated product's status to DRAFT and is_published to false with published_at set to null.
4. THE Product_Service SHALL clone all ProductCategory links, ProductMedia records (same URLs, new records), ProductOptions with their ProductOptionValues, and ProductVariants with their VariantOptionValue links.
5. THE Product_Service SHALL generate new unique SKUs for cloned variants by appending "-copy" suffix (with numeric suffix if needed for uniqueness).
6. THE Product_Service SHALL create new Inventory records for all cloned variants with total_quantity, available_quantity, and reserved_quantity all set to 0.
7. THE Product_Service SHALL execute the entire duplication within a single database transaction to ensure atomicity.
8. THE Product_Service SHALL leave the original product completely unchanged after duplication.
9. IF the specified product ID does not exist within the current store, THEN THE Product_Service SHALL return a 404 Not Found error.
10. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.


### Requirement 15: List Product Options

**User Story:** As a store admin, I want to list all options for a product, so that I can see the configurable dimensions (e.g., Color, Size).

#### Acceptance Criteria

1. WHEN an authenticated member with product:view permission requests the options list for a product, THE Product_Option_Service SHALL return all ProductOption records for the specified product ordered by position, each including their associated ProductOptionValues ordered by position.
2. IF the specified product ID does not exist within the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 16: Create Product Option

**User Story:** As a store admin, I want to add options to a product (e.g., Color, Size), so that I can define configurable dimensions for variant generation.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a valid option creation request for a product, THE Product_Option_Service SHALL create a new ProductOption record and return it with a 201 status.
2. THE Product_Option_Service SHALL validate the creation request using a Zod schema requiring name (1-50 characters) and allowing optional position (non-negative integer).
3. IF an option with the same name already exists for the specified product, THEN THE Product_Option_Service SHALL return a 409 Conflict error with the message "Option with this name already exists for this product".
4. WHEN position is not provided, THE Product_Option_Service SHALL set position to max(position) + 1 among the product's existing options.
5. IF the specified product ID does not exist within the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 17: Update Product Option

**User Story:** As a store admin, I want to update an option's name or position, so that I can correct or reorder product options.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid update request for an existing option, THE Product_Option_Service SHALL update the ProductOption record and return the updated record.
2. THE Product_Option_Service SHALL validate the update request using a Zod schema allowing optional name (1-50 characters) and optional position (non-negative integer).
3. IF the new name conflicts with another option on the same product, THEN THE Product_Option_Service SHALL return a 409 Conflict error with the message "Option with this name already exists for this product".
4. IF the specified option ID does not exist for the specified product in the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 18: Delete Product Option

**User Story:** As a store admin, I want to delete a product option, so that I can remove unnecessary configurable dimensions.

#### Acceptance Criteria

1. WHEN an authenticated member with product:delete permission submits a deletion request for an existing option, THE Product_Option_Service SHALL delete the ProductOption record and all its associated ProductOptionValues via cascade, and return a 200 success response.
2. IF the specified option ID does not exist for the specified product in the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 19: Add Option Value

**User Story:** As a store admin, I want to add values to a product option (e.g., Red, Blue for Color), so that I can define the choices available for variant generation.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a valid value creation request for an option, THE Product_Option_Service SHALL create a new ProductOptionValue record and return it with a 201 status.
2. THE Product_Option_Service SHALL validate the creation request using a Zod schema requiring value (1-100 characters) and allowing optional position (non-negative integer).
3. IF a value with the same text already exists for the specified option, THEN THE Product_Option_Service SHALL return a 409 Conflict error with the message "This value already exists for this option".
4. WHEN position is not provided, THE Product_Option_Service SHALL set position to max(position) + 1 among the option's existing values.
5. IF the specified option ID does not exist for the specified product in the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 20: Update Option Value

**User Story:** As a store admin, I want to update an option value's text or position, so that I can correct or reorder option values.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid update request for an existing option value, THE Product_Option_Service SHALL update the ProductOptionValue record and return the updated record.
2. THE Product_Option_Service SHALL validate the update request using a Zod schema allowing optional value (1-100 characters) and optional position (non-negative integer).
3. IF the new value text conflicts with another value on the same option, THEN THE Product_Option_Service SHALL return a 409 Conflict error with the message "This value already exists for this option".
4. IF the specified value ID does not exist for the specified option in the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
6. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 21: Delete Option Value

**User Story:** As a store admin, I want to delete an option value, so that I can remove choices that are no longer available.

#### Acceptance Criteria

1. WHEN an authenticated member with product:delete permission submits a deletion request for an existing option value, THE Product_Option_Service SHALL delete the ProductOptionValue record and return a 200 success response.
2. IF the specified value ID does not exist for the specified option in the current store, THEN THE Product_Option_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.


### Requirement 22: List Product Variants

**User Story:** As a store admin, I want to list all variants for a product, so that I can see all purchasable configurations and their details.

#### Acceptance Criteria

1. WHEN an authenticated member with product:view permission requests the variants list for a product, THE Product_Variant_Service SHALL return all ProductVariant records for the specified product including their associated option values and inventory data.
2. IF the specified product ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 23: Create Product Variant

**User Story:** As a store admin, I want to manually create a variant for a product, so that I can add specific configurations beyond auto-generation.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a valid variant creation request, THE Product_Variant_Service SHALL create a new ProductVariant record with an associated Inventory record (all quantities 0) and return the created variant with a 201 status.
2. THE Product_Variant_Service SHALL validate the creation request using a Zod schema requiring title (1-200 characters) and sku (1-100 characters), and allowing optional barcode (max 100 characters or null), optional price (non-negative number or null), optional compare_at_price (non-negative number or null), optional cost_price (non-negative number or null), optional weight_grams (non-negative integer or null), optional is_active (boolean, default true), and optional option_value_ids (array of positive integers).
3. IF the specified SKU already exists in the current store, THEN THE Product_Variant_Service SHALL return a 409 Conflict error with the message "SKU already exists in this store".
4. IF a barcode is provided and it already exists in the current store, THEN THE Product_Variant_Service SHALL return a 409 Conflict error with the message "Barcode already exists in this store".
5. WHEN option_value_ids are provided, THE Product_Variant_Service SHALL create VariantOptionValue link records for each value.
6. THE Product_Variant_Service SHALL set the product's has_variants to true after creating the variant.
7. IF the specified product ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
8. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
9. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 24: Get Variant by ID

**User Story:** As a store admin, I want to view a specific variant's details, so that I can review its pricing, SKU, and inventory.

#### Acceptance Criteria

1. WHEN an authenticated member with product:view permission requests a specific variant by ID, THE Product_Variant_Service SHALL return the ProductVariant record with its associated option values and inventory data.
2. IF the specified variant ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 25: Update Product Variant

**User Story:** As a store admin, I want to update a variant's price, SKU, barcode, or other details, so that I can keep variant information accurate.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid update request for an existing variant, THE Product_Variant_Service SHALL update the ProductVariant record and return the updated record.
2. THE Product_Variant_Service SHALL validate the update request using a Zod schema allowing optional title (1-200 characters), optional sku (1-100 characters), optional barcode (max 100 characters or null), optional price (non-negative number or null), optional compare_at_price (non-negative number or null), optional cost_price (non-negative number or null), optional weight_grams (non-negative integer or null), and optional is_active (boolean).
3. IF the new SKU conflicts with another variant in the same store, THEN THE Product_Variant_Service SHALL return a 409 Conflict error with the message "SKU already exists in this store".
4. IF the new barcode conflicts with another variant in the same store, THEN THE Product_Variant_Service SHALL return a 409 Conflict error with the message "Barcode already exists in this store".
5. IF the specified variant ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
6. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
7. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 26: Delete Product Variant

**User Story:** As a store admin, I want to delete a variant, so that I can remove configurations that are no longer available.

#### Acceptance Criteria

1. WHEN an authenticated member with product:delete permission submits a deletion request for an existing variant, THE Product_Variant_Service SHALL delete the ProductVariant record and its associated Inventory and VariantOptionValue records, and return a 200 success response.
2. IF the specified variant is the only remaining variant for its product, THEN THE Product_Variant_Service SHALL return a 400 Bad Request error with the message "Cannot delete the last variant of a product".
3. IF the specified variant has is_default set to true and other variants exist, THEN THE Product_Variant_Service SHALL reassign is_default to another variant before deletion.
4. IF the specified variant ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
5. IF the authenticated user does not have the product:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 27: Set Default Variant

**User Story:** As a store admin, I want to set a specific variant as the default, so that it is displayed as the primary option on the storefront.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a set-default request for an existing variant, THE Product_Variant_Service SHALL set is_default to true on the specified variant and set is_default to false on all other variants of the same product, and return the updated variant.
2. IF the specified variant ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 28: Generate Variants from Options

**User Story:** As a store admin, I want to auto-generate all variant combinations from product options, so that I don't have to manually create each variant.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a generate request for a product, THE Product_Variant_Service SHALL compute the cartesian product of all option values and create a new ProductVariant for each combination that does not already exist.
2. THE Product_Variant_Service SHALL generate the variant title by joining option values with " / " separator (e.g., "Red / Large / Cotton").
3. THE Product_Variant_Service SHALL auto-generate the SKU as "{product-slug}-{value1}-{value2}-..." using slugified option values, ensuring uniqueness within the store by appending numeric suffixes if needed.
4. THE Product_Variant_Service SHALL create VariantOptionValue link records for each generated variant.
5. THE Product_Variant_Service SHALL create an Inventory record for each generated variant with total_quantity, available_quantity, and reserved_quantity all set to 0 and low_stock_threshold set to 5.
6. THE Product_Variant_Service SHALL skip combinations that already exist as variants (idempotent operation) and report the count of created and skipped variants.
7. THE Product_Variant_Service SHALL set the product's has_variants to true after generation.
8. THE Product_Variant_Service SHALL execute the entire generation within a single database transaction.
9. IF the product has no options defined, THEN THE Product_Variant_Service SHALL return a 400 Bad Request error with the message "Product has no options defined. Add options and values first."
10. IF any option has no values defined, THEN THE Product_Variant_Service SHALL return a 400 Bad Request error with the message "All options must have at least one value".
11. IF the specified product ID does not exist within the current store, THEN THE Product_Variant_Service SHALL return a 404 Not Found error.
12. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
13. WHEN generation succeeds, THE Product_Variant_Service SHALL return a 201 response with the counts of created and skipped variants and the total combination count.


### Requirement 29: List Inventory

**User Story:** As a store admin, I want to view inventory levels for all variants in my store, so that I can monitor stock availability.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:view permission requests the inventory list, THE Inventory_Service SHALL return a paginated list of Inventory records with associated variant and product data, supporting page (default 1) and limit (default 20, max 100) parameters.
2. WHEN a search parameter is provided, THE Inventory_Service SHALL filter results by matching the search term against variant SKU, variant title, or product name.
3. WHEN the low_stock_only parameter is set to "true", THE Inventory_Service SHALL filter results to only inventory records where available_quantity is less than or equal to low_stock_threshold.
4. THE Inventory_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
5. IF the authenticated user does not have the inventory:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 30: Get Low-Stock Items

**User Story:** As a store admin, I want to see which variants are running low on stock, so that I can reorder before running out.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:view permission requests low-stock items, THE Inventory_Service SHALL return a paginated list of Inventory records where available_quantity is less than or equal to low_stock_threshold, including associated variant and product data.
2. THE Inventory_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
3. IF the authenticated user does not have the inventory:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 31: Get Inventory for Variant

**User Story:** As a store admin, I want to view the inventory details for a specific variant, so that I can check its stock levels.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:view permission requests inventory for a specific variant, THE Inventory_Service SHALL return the Inventory record including total_quantity, available_quantity, reserved_quantity, and low_stock_threshold.
2. IF no inventory record exists for the specified variant in the current store, THEN THE Inventory_Service SHALL return a 404 Not Found error with the message "Inventory record not found for this variant".
3. IF the authenticated user does not have the inventory:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 32: Adjust Inventory

**User Story:** As a store admin, I want to adjust inventory levels for a variant (add stock, remove stock), so that I can keep stock counts accurate.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:adjust permission submits a valid adjustment request, THE Inventory_Service SHALL update the inventory quantities and create an InventoryMovement record, and return the updated Inventory record.
2. THE Inventory_Service SHALL validate the adjustment request using a Zod schema requiring type (one of: IN, ADJUSTMENT_IN, OUT, ADJUSTMENT_OUT), quantity (positive integer), and allowing optional reason (max 500 characters), optional reference_type (max 50 characters), and optional reference_id (positive integer).
3. WHEN the type is IN or ADJUSTMENT_IN, THE Inventory_Service SHALL increase both total_quantity and available_quantity by the specified quantity.
4. WHEN the type is OUT or ADJUSTMENT_OUT, THE Inventory_Service SHALL decrease both total_quantity and available_quantity by the specified quantity.
5. IF the type is OUT or ADJUSTMENT_OUT and the specified quantity exceeds available_quantity, THEN THE Inventory_Service SHALL return a 400 Bad Request error with the message "Insufficient stock. Available: {available}, Requested: {quantity}".
6. THE Inventory_Service SHALL maintain the invariant: available_quantity = total_quantity - reserved_quantity at all times.
7. THE Inventory_Service SHALL create an InventoryMovement record with the actor_user_id set to the authenticated user's ID, quantity_change set to positive for IN types and negative for OUT types, and the provided reason and reference fields.
8. THE Inventory_Service SHALL execute the adjustment and movement creation within a single database transaction.
9. IF no inventory record exists for the specified variant in the current store, THEN THE Inventory_Service SHALL return a 404 Not Found error with the message "Inventory record not found for this variant".
10. IF the authenticated user does not have the inventory:adjust permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
11. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 33: List Inventory Movements

**User Story:** As a store admin, I want to view the history of inventory movements, so that I can audit stock changes and identify discrepancies.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:view permission requests the movement list, THE Inventory_Service SHALL return a paginated list of InventoryMovement records with associated variant data, supporting page (default 1) and limit (default 50, max 100) parameters.
2. WHEN a type filter parameter is provided, THE Inventory_Service SHALL filter results by the specified InventoryMovementType.
3. WHEN from_date and/or to_date parameters are provided, THE Inventory_Service SHALL filter results by the created_at timestamp within the specified date range.
4. THE Inventory_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
5. IF the authenticated user does not have the inventory:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 34: Get Variant Movement History

**User Story:** As a store admin, I want to view the movement history for a specific variant, so that I can trace all stock changes for that item.

#### Acceptance Criteria

1. WHEN an authenticated member with inventory:view permission requests movements for a specific variant, THE Inventory_Service SHALL return a paginated list of InventoryMovement records for that variant ordered by created_at descending.
2. THE Inventory_Service SHALL return pagination metadata including total count, current page, limit, and total pages.
3. IF the specified variant ID does not exist within the current store, THEN THE Inventory_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the inventory:view permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.


### Requirement 35: Upload Product Media

**User Story:** As a store admin, I want to upload images for a product, so that I can showcase the product visually on the storefront.

#### Acceptance Criteria

1. WHEN an authenticated member with product:create permission submits a media upload request for a product, THE Product_Media_Service SHALL store the file (S3 or local storage), create a ProductMedia record with the file URL, and return the created record with a 201 status.
2. THE Product_Media_Service SHALL validate that the uploaded file is an allowed image type (jpg, png, webp, gif).
3. THE Product_Media_Service SHALL validate that the uploaded file does not exceed 5MB in size.
4. THE Product_Media_Service SHALL set the sort_order to max(sort_order) + 1 among the product's existing media.
5. IF the uploaded file type is not an allowed image type, THEN THE Product_Media_Service SHALL return a 400 Bad Request error with the message "Only image files are allowed (jpg, png, webp, gif)".
6. IF the uploaded file exceeds the size limit, THEN THE Product_Media_Service SHALL return a 400 Bad Request error with the message "File size exceeds the 5MB limit".
7. IF the specified product ID does not exist within the current store, THEN THE Product_Media_Service SHALL return a 404 Not Found error.
8. IF the authenticated user does not have the product:create permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 36: Update Product Media

**User Story:** As a store admin, I want to update a media item's alt text, so that I can improve accessibility and SEO.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid update request for an existing media item, THE Product_Media_Service SHALL update the ProductMedia record's alt_text and return the updated record.
2. THE Product_Media_Service SHALL validate the update request using a Zod schema allowing optional alt_text (max 500 characters or null).
3. IF the specified media ID does not exist for the specified product in the current store, THEN THE Product_Media_Service SHALL return a 404 Not Found error.
4. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
5. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 37: Reorder Product Media

**User Story:** As a store admin, I want to reorder product images, so that I can control which image appears first on the storefront.

#### Acceptance Criteria

1. WHEN an authenticated member with product:update permission submits a valid reorder request, THE Product_Media_Service SHALL update the sort_order for each specified media item in a single atomic transaction and return a 200 success response.
2. THE Product_Media_Service SHALL validate the reorder request using a Zod schema requiring an items array (1-50 items) where each item has id (positive integer) and sort_order (non-negative integer).
3. IF any item ID does not reference an existing media record for the specified product in the current store, THEN THE Product_Media_Service SHALL return a 400 Bad Request error.
4. IF the authenticated user does not have the product:update permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.
5. WHEN validation fails, THE validation middleware SHALL return a 422 Unprocessable Entity error with field-level error details.

### Requirement 38: Delete Product Media

**User Story:** As a store admin, I want to delete a product image, so that I can remove outdated or incorrect media.

#### Acceptance Criteria

1. WHEN an authenticated member with product:delete permission submits a deletion request for an existing media item, THE Product_Media_Service SHALL delete the ProductMedia record and remove the file from storage (S3 or local), and return a 200 success response.
2. IF the specified media ID does not exist for the specified product in the current store, THEN THE Product_Media_Service SHALL return a 404 Not Found error.
3. IF the authenticated user does not have the product:delete permission, THEN THE Require_Permission middleware SHALL return a 403 Forbidden error.

### Requirement 39: Catalog Route Protection

**User Story:** As the system, I want all catalog endpoints to enforce authentication, store context resolution, and permission checks, so that only authorized members can manage the product catalog.

#### Acceptance Criteria

1. THE catalog route layer SHALL apply the verifyToken middleware first, followed by resolveStoreContext, followed by the appropriate requirePermission middleware for each endpoint.
2. IF the Access_Token is missing or invalid, THEN THE verifyToken middleware SHALL return a 401 Unauthorized error before any store context resolution occurs.
3. WHILE the store status is SUSPENDED or ARCHIVED, THE Resolve_Store_Context middleware SHALL return a 403 Forbidden error indicating the store is not accessible.
4. WHILE a member's status is not ACTIVE, THE Resolve_Store_Context middleware SHALL return a 403 Forbidden error indicating the membership is not active.
5. THE catalog endpoints SHALL use the x-store-id request header to identify the target store context.

### Requirement 40: Input Validation for Catalog Endpoints

**User Story:** As the system, I want all catalog request data to be validated against Zod schemas, so that only well-formed data reaches the service layer.

#### Acceptance Criteria

1. THE Category_Service SHALL validate all creation and update requests against their respective Zod schemas before processing, returning a 422 Unprocessable Entity error with field-level details on validation failure.
2. THE Product_Service SHALL validate all creation, update, status change, and publish requests against their respective Zod schemas before processing.
3. THE Product_Option_Service SHALL validate option and value creation/update requests against their respective Zod schemas before processing.
4. THE Product_Variant_Service SHALL validate variant creation and update requests against their respective Zod schemas before processing.
5. THE Inventory_Service SHALL validate adjustment requests against the adjustInventorySchema before processing.
6. THE Product_Media_Service SHALL validate media update and reorder requests against their respective Zod schemas before processing.
7. WHEN validation fails on any catalog endpoint, THE validation middleware SHALL return a 422 Unprocessable Entity error with a JSON response containing an array of field-level errors, each specifying the field path and the validation failure reason.

### Requirement 41: Multi-Tenant Data Isolation

**User Story:** As the system, I want all catalog data to be strictly isolated per store, so that no store can access another store's categories, products, variants, or inventory.

#### Acceptance Criteria

1. THE Category_Service SHALL include store_id in all database queries to ensure categories from other stores are never returned or modified.
2. THE Product_Service SHALL include store_id in all database queries to ensure products from other stores are never returned or modified.
3. THE Product_Variant_Service SHALL include store_id in all database queries to ensure variants from other stores are never returned or modified.
4. THE Inventory_Service SHALL include store_id in all database queries to ensure inventory records from other stores are never returned or modified.
5. THE Product_Media_Service SHALL include store_id in all database queries to ensure media from other stores are never returned or modified.
6. THE Product_Option_Service SHALL include store_id in all database queries to ensure options and values from other stores are never returned or modified.
