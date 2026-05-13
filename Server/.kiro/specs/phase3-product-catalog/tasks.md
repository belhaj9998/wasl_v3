# Implementation Plan: Phase 3 — Full Product Catalog

## Overview

This plan implements the complete product catalog system: category management with tree structures, product CRUD with publishing workflows, product options and variant generation, inventory tracking with movement history, and media management. The implementation follows the established controller → service → Prisma pattern with Zod validation, building incrementally from validators through services, controllers, and finally route wiring.

## Tasks

- [x] 1. Create catalog validation schemas
  - [x] 1.1 Create catalog validators (`src/validators/catalog.validators.ts`)
    - Implement all Zod schemas as defined in the design document:
    - Category schemas: `createCategorySchema`, `updateCategorySchema`, `reorderCategoriesSchema`, `categoryListQuerySchema`
    - Product schemas: `createProductSchema`, `updateProductSchema`, `updateProductStatusSchema`, `publishProductSchema`, `productListQuerySchema`
    - Option schemas: `createOptionSchema`, `updateOptionSchema`, `createOptionValueSchema`, `updateOptionValueSchema`
    - Variant schemas: `createVariantSchema`, `updateVariantSchema`
    - Inventory schemas: `adjustInventorySchema`, `inventoryListQuerySchema`, `movementListQuerySchema`
    - Media schemas: `updateMediaSchema`, `reorderMediaSchema`
    - Param schemas: `storeIdParamSchema`, `categoryIdParamSchema`, `productIdParamSchema`, `productMediaIdParamSchema`, `productOptionIdParamSchema`, `optionValueIdParamSchema`, `variantIdParamSchema`, `inventoryVariantIdParamSchema`
    - _Requirements: 40.1, 40.2, 40.3, 40.4, 40.5, 40.6, 40.7_

  - [ ]* 1.2 Write property test for Zod schema validation (Property 4, Property 5)
    - **Property 4: Category Slug Uniqueness — slug generation always produces URL-safe, non-empty string**
    - **Property 5: Product Slug Uniqueness — slug generation always produces URL-safe, non-empty string**
    - Generate random strings at boundary lengths for each schema
    - Assert: valid inputs pass, invalid inputs are rejected with field-level errors
    - **Validates: Requirements 2.3, 2.4, 8.3, 10.3, 40.1–40.7**

- [x] 2. Implement CategoryService
  - [x] 2.1 Create CategoryService (`src/services/store-admin/category.Service.ts`)
    - Implement `list(storeId, options)` — support flat paginated list and nested tree structure via `flat` query param, filter by parent_id and is_active
    - Implement `buildCategoryTree(categories)` — O(n) hash-map approach to build nested tree sorted by sort_order
    - Implement `create(storeId, data)` — validate parent_id exists in store, check depth ≤ 3, generate unique slug, set sort_order to max+1 among siblings
    - Implement `getById(storeId, categoryId)` — fetch single category, 404 if not found
    - Implement `update(storeId, categoryId, data)` — validate circular reference prevention, depth check, regenerate slug if name changes
    - Implement `delete(storeId, categoryId)` — reassign children to deleted category's parent, cascade-delete ProductCategory links
    - Implement `reorder(storeId, items)` — atomic transaction to update sort_order and optional parent_id, validate circular refs and depth
    - Helper: `getDepth(categoryId, tx)` — compute depth of a category by traversing parent chain
    - Helper: `getDescendantIds(categoryId, tx)` — get all descendant IDs to prevent circular references
    - _Requirements: 1.1–1.6, 2.1–2.9, 3.1–3.3, 4.1–4.8, 5.1–5.5, 6.1–6.7_

  - [ ]* 2.2 Write property test for category tree acyclicity (Property 6)
    - **Property 6: Category Tree Acyclicity**
    - For any category, following parent_id chain always terminates at null
    - **Validates: Requirements 4.4, 6.4**

  - [ ]* 2.3 Write property test for category tree depth limit (Property 7)
    - **Property 7: Category Tree Depth Limit**
    - For any category, depth from root never exceeds 3 levels
    - **Validates: Requirements 2.6, 4.5, 6.5**

  - [ ]* 2.4 Write property test for category child reparenting on delete (Property 13)
    - **Property 13: Category Child Reparenting on Delete**
    - After deletion, all children are reassigned to deleted category's parent, tree remains acyclic and within depth limits
    - **Validates: Requirement 5.2**

- [x] 3. Implement ProductService
  - [x] 3.1 Create ProductService (`src/services/store-admin/product.Service.ts`)
    - Implement `list(storeId, params)` — paginated listing with filters (status, category_id, min_price, max_price, search, is_published), sorting (name, price, created_at, updated_at), include first media and one active variant
    - Implement `create(storeId, data)` — validate compare_at_price > base_price, validate category_ids exist, generate unique slug, create ProductCategory links, auto-create default variant + inventory if has_variants=false
    - Implement `getById(storeId, productId)` — fetch with categories, options+values, variants+option_values, media sorted by sort_order, inventory
    - Implement `update(storeId, productId, data)` — regenerate slug if name changes, replace category links if category_ids provided
    - Implement `delete(storeId, productId)` — delete product (cascade handles variants, options, media, inventory, category links)
    - Implement `updateStatus(storeId, productId, status)` — enforce valid transitions: DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT
    - Implement `publish(storeId, productId, publish)` — set is_published and published_at timestamp
    - Implement `duplicate(storeId, productId)` — full clone in transaction: product, categories, media, options+values, variants+option_values, fresh inventory (all zeros), new SKUs with -copy suffix
    - Helper: `ensureUniqueSlug(tx, storeId, baseSlug)` — append numeric suffix for uniqueness
    - _Requirements: 7.1–7.11, 8.1–8.9, 9.1–9.3, 10.1–10.8, 11.1–11.3, 12.1–12.6, 13.1–13.5, 14.1–14.10_

  - [ ]* 3.2 Write property test for product status transitions (Property 12)
    - **Property 12: Product Status Transition Validity**
    - Only DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT succeed; all others rejected
    - **Validates: Requirements 12.3, 12.4**

  - [ ]* 3.3 Write property test for product creation defaults (Property 14)
    - **Property 14: Product Creation Defaults**
    - New product always has status=DRAFT, is_published=false; if has_variants=false, exactly one default variant with inventory at zero
    - **Validates: Requirements 8.1, 8.6**

  - [ ]* 3.4 Write property test for product duplication integrity (Property 11)
    - **Property 11: Product Duplication Integrity**
    - Source unchanged, duplicate has status=DRAFT, is_published=false, all inventory at zero
    - **Validates: Requirements 14.2, 14.3, 14.6, 14.8**

- [x] 4. Checkpoint — Verify category and product services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ProductOptionService
  - [x] 5.1 Create ProductOptionService (`src/services/store-admin/productOption.Service.ts`)
    - Implement `list(storeId, productId)` — return all options for product ordered by position, each with values ordered by position
    - Implement `create(storeId, productId, data)` — validate product exists in store, check option name uniqueness per product (409), set position to max+1 if not provided
    - Implement `update(storeId, productId, optionId, data)` — validate option exists, check name uniqueness if name changed (409)
    - Implement `delete(storeId, productId, optionId)` — delete option and cascade-delete values
    - Implement `addValue(storeId, productId, optionId, data)` — validate option exists, check value uniqueness per option (409), set position to max+1 if not provided
    - Implement `updateValue(storeId, productId, optionId, valueId, data)` — validate value exists, check uniqueness if value changed (409)
    - Implement `deleteValue(storeId, productId, optionId, valueId)` — delete option value
    - _Requirements: 15.1–15.3, 16.1–16.7, 17.1–17.6, 18.1–18.3, 19.1–19.7, 20.1–20.6, 21.1–21.3_

- [x] 6. Implement ProductVariantService
  - [x] 6.1 Create ProductVariantService (`src/services/store-admin/productVariant.Service.ts`)
    - Implement `list(storeId, productId)` — return all variants with option_values and inventory
    - Implement `create(storeId, productId, data)` — validate SKU uniqueness (409), barcode uniqueness (409), create variant + inventory record, create VariantOptionValue links, set product.has_variants=true
    - Implement `getById(storeId, variantId)` — fetch variant with option_values and inventory
    - Implement `update(storeId, variantId, data)` — validate SKU/barcode uniqueness if changed (409)
    - Implement `delete(storeId, variantId)` — prevent deleting last variant (400), reassign is_default if deleting default variant
    - Implement `setDefault(storeId, variantId)` — unset current default, set new default in transaction
    - Implement `generateVariants(storeId, productId)` — cartesian product of option values, skip existing combinations, generate title/SKU, create variants + inventory in transaction, set has_variants=true
    - Helper: `cartesianProduct(arrays)` — compute cartesian product of arrays
    - Helper: `ensureUniqueSku(tx, storeId, baseSku)` — append numeric suffix for SKU uniqueness
    - _Requirements: 22.1–22.3, 23.1–23.9, 24.1–24.3, 25.1–25.7, 26.1–26.5, 27.1–27.3, 28.1–28.13_

  - [ ]* 6.2 Write property test for variant SKU uniqueness (Property 3)
    - **Property 3: Variant SKU Uniqueness**
    - For any two variants in the same store, SKUs are always different
    - **Validates: Requirements 23.3, 25.3, 28.3**

  - [ ]* 6.3 Write property test for variant generation completeness and idempotence (Property 8)
    - **Property 8: Variant Generation Completeness and Idempotence**
    - After generation, total variants = cartesian product count; second run creates zero new variants
    - **Validates: Requirements 28.1, 28.6**

  - [ ]* 6.4 Write property test for default variant uniqueness (Property 9)
    - **Property 9: Default Variant Uniqueness**
    - At most one variant per product has is_default=true at any time
    - **Validates: Requirements 26.3, 27.1**

- [x] 7. Implement InventoryService
  - [x] 7.1 Create InventoryService (`src/services/store-admin/inventory.Service.ts`)
    - Implement `list(storeId, params)` — paginated list with search (SKU, title, product name) and low_stock_only filter, include variant and product data
    - Implement `getLowStock(storeId, params)` — filter where available_quantity <= low_stock_threshold, paginated
    - Implement `getByVariantId(storeId, variantId)` — fetch inventory record, 404 if not found
    - Implement `adjust(storeId, variantId, data, actorUserId)` — validate type, calculate new quantities, check available >= 0 for OUT types, update inventory + create movement in transaction
    - Implement `listMovements(storeId, params)` — paginated list with type filter and date range filter
    - Implement `getVariantMovements(storeId, variantId, params)` — paginated movements for specific variant
    - _Requirements: 29.1–29.5, 30.1–30.3, 31.1–31.3, 32.1–32.11, 33.1–33.5, 34.1–34.4_

  - [ ]* 7.2 Write property test for inventory invariant (Property 1)
    - **Property 1: Inventory Invariant**
    - After any adjustment: available = total - reserved, all quantities >= 0
    - **Validates: Requirements 32.3, 32.4, 32.5, 32.6**

  - [ ]* 7.3 Write property test for inventory movement consistency (Property 2)
    - **Property 2: Inventory Movement Consistency**
    - Sum of all movement quantity_change values equals current total_quantity; sign matches type
    - **Validates: Requirements 32.7, 32.8**

  - [ ]* 7.4 Write property test for low-stock filter correctness (Property 15)
    - **Property 15: Low-Stock Filter Correctness**
    - Every returned record has available_quantity <= low_stock_threshold
    - **Validates: Requirement 30.1**

- [x] 8. Checkpoint — Verify options, variants, and inventory services
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement ProductMediaService
  - [x] 9.1 Create ProductMediaService (`src/services/store-admin/productMedia.Service.ts`)
    - Implement `upload(storeId, productId, file)` — validate file type (jpg, png, webp, gif) and size (≤5MB), store file (S3 or local), create ProductMedia record with sort_order = max+1
    - Implement `updateAltText(storeId, productId, mediaId, altText)` — update alt_text field, 404 if not found
    - Implement `reorder(storeId, productId, items)` — atomic transaction to update sort_order for each media item, validate all IDs belong to product
    - Implement `delete(storeId, productId, mediaId)` — delete record and remove file from storage, 404 if not found
    - _Requirements: 35.1–35.8, 36.1–36.5, 37.1–37.5, 38.1–38.3_

- [x] 10. Implement controllers
  - [x] 10.1 Create CategoryController (`src/controllers/store-admin/category.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendSuccess (tree) or sendPaginated (flat)
    - Implement `create` — extract storeId and validated body, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and id param, call service, respond with sendSuccess
    - Implement `update` — extract storeId, id param, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId and id param, call service, respond with sendSuccess
    - Implement `reorder` — extract storeId and body, call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

  - [x] 10.2 Create ProductController (`src/controllers/store-admin/product.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `create` — extract storeId and body, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and id param, call service, respond with sendSuccess
    - Implement `update` — extract storeId, id param, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId and id param, call service, respond with sendSuccess
    - Implement `updateStatus` — extract storeId, id param, and body.status, call service, respond with sendSuccess
    - Implement `publish` — extract storeId, id param, and body.publish, call service, respond with sendSuccess
    - Implement `duplicate` — extract storeId and id param, call service, respond with sendSuccess (201)
    - Wrap all handlers with asyncHandler
    - _Requirements: 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1_

  - [x] 10.3 Create ProductOptionController (`src/controllers/store-admin/productOption.Controller.ts`)
    - Implement `list` — extract storeId and productId, call service, respond with sendSuccess
    - Implement `create` — extract storeId, productId, and body, call service, respond with sendSuccess (201)
    - Implement `update` — extract storeId, productId, optionId, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId, productId, and optionId, call service, respond with sendSuccess
    - Implement `addValue` — extract storeId, productId, optionId, and body, call service, respond with sendSuccess (201)
    - Implement `updateValue` — extract storeId, productId, optionId, valueId, and body, call service, respond with sendSuccess
    - Implement `deleteValue` — extract storeId, productId, optionId, and valueId, call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 15.1, 16.1, 17.1, 18.1, 19.1, 20.1, 21.1_

  - [x] 10.4 Create ProductVariantController (`src/controllers/store-admin/productVariant.Controller.ts`)
    - Implement `list` — extract storeId and productId, call service, respond with sendSuccess
    - Implement `create` — extract storeId, productId, and body, call service, respond with sendSuccess (201)
    - Implement `getById` — extract storeId and variantId, call service, respond with sendSuccess
    - Implement `update` — extract storeId, variantId, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId and variantId, call service, respond with sendSuccess
    - Implement `setDefault` — extract storeId and variantId, call service, respond with sendSuccess
    - Implement `generate` — extract storeId and productId, call service, respond with sendSuccess (201)
    - Wrap all handlers with asyncHandler
    - _Requirements: 22.1, 23.1, 24.1, 25.1, 26.1, 27.1, 28.1_

  - [x] 10.5 Create InventoryController (`src/controllers/store-admin/inventory.Controller.ts`)
    - Implement `list` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `getLowStock` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `getByVariantId` — extract storeId and variantId, call service, respond with sendSuccess
    - Implement `adjust` — extract storeId, variantId, body, and req.user.userId, call service, respond with sendSuccess
    - Implement `listMovements` — extract storeId and query params, call service, respond with sendPaginated
    - Implement `getVariantMovements` — extract storeId, variantId, and query params, call service, respond with sendPaginated
    - Wrap all handlers with asyncHandler
    - _Requirements: 29.1, 30.1, 31.1, 32.1, 33.1, 34.1_

  - [x] 10.6 Create ProductMediaController (`src/controllers/store-admin/productMedia.Controller.ts`)
    - Implement `upload` — extract storeId, productId, and file from multer, call service, respond with sendSuccess (201)
    - Implement `updateAltText` — extract storeId, productId, mediaId, and body, call service, respond with sendSuccess
    - Implement `reorder` — extract storeId, productId, and body, call service, respond with sendSuccess
    - Implement `delete` — extract storeId, productId, and mediaId, call service, respond with sendSuccess
    - Wrap all handlers with asyncHandler
    - _Requirements: 35.1, 36.1, 37.1, 38.1_

- [x] 11. Checkpoint — Verify controllers compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement catalog routes and wire into main router
  - [x] 12.1 Create catalog routes file (`src/routes/catalog.routes.ts`)
    - Apply `verifyToken` and `resolveStoreContext` to all routes via `router.use()`
    - Define category routes: GET /categories, POST /categories, GET /categories/:id, PATCH /categories/:id, DELETE /categories/:id, PATCH /categories/reorder
    - Define product routes: GET /products, POST /products, GET /products/:id, PATCH /products/:id, DELETE /products/:id, PATCH /products/:id/status, POST /products/:id/publish, POST /products/:id/duplicate
    - Define option routes: GET /products/:productId/options, POST /products/:productId/options, PATCH /products/:productId/options/:optionId, DELETE /products/:productId/options/:optionId
    - Define option value routes: POST /products/:productId/options/:optionId/values, PATCH /products/:productId/options/:optionId/values/:valueId, DELETE /products/:productId/options/:optionId/values/:valueId
    - Define variant routes: GET /products/:productId/variants, POST /products/:productId/variants, GET /variants/:id, PATCH /variants/:id, DELETE /variants/:id, PATCH /variants/:id/set-default, POST /products/:productId/variants/generate
    - Define inventory routes: GET /inventory, GET /inventory/low-stock, GET /inventory/:variantId, POST /inventory/:variantId/adjust, GET /inventory/movements, GET /inventory/:variantId/movements
    - Define media routes: POST /products/:productId/media (with multer), PATCH /products/:productId/media/:id, PATCH /products/:productId/media/reorder, DELETE /products/:productId/media/:id
    - Apply `requirePermission` per endpoint with correct permission codes
    - Apply `validateBody`, `validateQuery`, `validateParams` with appropriate Zod schemas
    - _Requirements: 39.1–39.5, 40.1–40.7, 41.1–41.6_

  - [x] 12.2 Wire catalog routes into main router (`src/routes/index.ts`)
    - Import `catalogRoutes` from `./catalog.routes`
    - Mount at `/api/stores/:storeId` alongside existing storeAdmin routes
    - Ensure route is mounted before the 404 catch-all
    - _Requirements: 39.1, 39.5_

- [ ] 13. Implement multi-tenant isolation verification
  - [x] 13.1 Verify all services include store_id in queries
    - Audit all service methods to confirm store_id is included in every Prisma where clause
    - Ensure no query can return or modify data from another store
    - _Requirements: 41.1–41.6_

  - [ ]* 13.2 Write property test for multi-tenant data isolation (Property 10)
    - **Property 10: Multi-Tenant Data Isolation**
    - All entities in any response have store_id matching the requesting store
    - **Validates: Requirements 41.1–41.6**

- [x] 14. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript with Express + Prisma + PostgreSQL + Zod
- Existing infrastructure (asyncHandler, AppError, sendSuccess/sendPaginated, verifyToken, resolveStoreContext, requirePermission, validateBody/validateQuery/validateParams, slugify) is reused
- The `src/services/store-admin/` directory already exists from Phase 2
- All nullable fields in schemas use `.nullable().optional()` pattern for PATCH semantics
- Media upload requires multer middleware configuration for file handling
- The reorder endpoint for categories should be defined BEFORE the `:id` param route to avoid route conflicts

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "3.4", "5.1"] },
    { "id": 4, "tasks": ["6.1", "7.1", "9.1"] },
    { "id": 5, "tasks": ["6.2", "6.3", "6.4", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["10.1", "10.2", "10.3", "10.4", "10.5", "10.6"] },
    { "id": 7, "tasks": ["12.1"] },
    { "id": 8, "tasks": ["12.2", "13.1"] },
    { "id": 9, "tasks": ["13.2"] }
  ]
}
```
