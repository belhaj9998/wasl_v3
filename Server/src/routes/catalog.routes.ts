import { Router } from "express";
import multer from "multer";
import {
  verifyToken,
  resolveStoreContext,
  requirePermission,
} from "../middlewares/auth.Middleware";
import {
  validateBody,
  validateQuery,
  validateParams,
} from "../middlewares/validate.Middleware";
import {
  // Category schemas
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
  categoryListQuerySchema,
  // Product schemas
  createProductSchema,
  updateProductSchema,
  updateProductStatusSchema,
  publishProductSchema,
  productListQuerySchema,
  // Option schemas
  createOptionSchema,
  updateOptionSchema,
  createOptionValueSchema,
  updateOptionValueSchema,
  // Variant schemas
  createVariantSchema,
  updateVariantSchema,
  // Inventory schemas
  adjustInventorySchema,
  inventoryListQuerySchema,
  movementListQuerySchema,
  // Media schemas
  updateMediaSchema,
  reorderMediaSchema,
  // Param schemas
  categoryIdParamSchema,
  productIdParamSchema,
  productMediaIdParamSchema,
  productOptionIdParamSchema,
  optionValueIdParamSchema,
  inventoryVariantIdParamSchema,
} from "../validators/catalog.validators";
import { verifyStoreSubscriptionAccess } from "../middlewares/subscriptionAccess.Middleware";
import * as categoryController from "../controllers/store-admin/category.Controller";
import * as productController from "../controllers/store-admin/product.Controller";
import * as productOptionController from "../controllers/store-admin/productOption.Controller";
import * as productVariantController from "../controllers/store-admin/productVariant.Controller";
import * as inventoryController from "../controllers/store-admin/inventory.Controller";
import * as productMediaController from "../controllers/store-admin/productMedia.Controller";

const router = Router({ mergeParams: true });

// Configure multer for media uploads (memory storage for buffer access)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Apply verifyToken and resolveStoreContext to ALL catalog routes
router.use(verifyToken, resolveStoreContext, verifyStoreSubscriptionAccess);

// ========== Category Routes ==========

// GET /categories — list categories (tree or flat)
router.get(
  "/categories",
  requirePermission("catalog.view"),
  validateQuery(categoryListQuerySchema),
  categoryController.list,
);

// POST /categories — create a new category
router.post(
  "/categories",
  requirePermission("categories.manage"),
  validateBody(createCategorySchema),
  categoryController.create,
);

// PATCH /categories/reorder — bulk reorder categories (BEFORE :id to avoid conflict)
router.patch(
  "/categories/reorder",
  requirePermission("categories.manage"),
  validateBody(reorderCategoriesSchema),
  categoryController.reorder,
);

// GET /categories/:id — get category by ID
router.get(
  "/categories/:id",
  requirePermission("catalog.view"),
  validateParams(categoryIdParamSchema),
  categoryController.getById,
);

// PATCH /categories/:id — update category
router.patch(
  "/categories/:id",
  requirePermission("catalog.view"),
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  categoryController.update,
);

// DELETE /categories/:id — delete category
router.delete(
  "/categories/:id",
  requirePermission("categories.manage"),
  validateParams(categoryIdParamSchema),
  categoryController.remove,
);

// ========== Product Routes ==========

// GET /products — list products (paginated with filters)
router.get(
  "/products",
  requirePermission("products.view"),
  validateQuery(productListQuerySchema),
  productController.list,
);

// POST /products — create a new product
router.post(
  "/products",
  requirePermission("products.create"),
  validateBody(createProductSchema),
  productController.create,
);

// GET /products/:id — get product by ID
router.get(
  "/products/:id",
  requirePermission("products.view"),
  validateParams(productIdParamSchema),
  productController.getById,
);

// PATCH /products/:id — update product
router.patch(
  "/products/:id",
  requirePermission("products.update"),
  validateParams(productIdParamSchema),
  validateBody(updateProductSchema),
  productController.update,
);

// DELETE /products/:id — delete product
router.delete(
  "/products/:id",
  requirePermission("products.delete"),
  validateParams(productIdParamSchema),
  productController.remove,
);

// PATCH /products/:id/status — update product status
router.patch(
  "/products/:id/status",
  requirePermission("products.update"),
  validateParams(productIdParamSchema),
  validateBody(updateProductStatusSchema),
  productController.updateStatus,
);

// POST /products/:id/publish — publish/unpublish product
router.post(
  "/products/:id/publish",
  requirePermission("products.update"),
  validateParams(productIdParamSchema),
  validateBody(publishProductSchema),
  productController.publish,
);

// POST /products/:id/duplicate — duplicate product
router.post(
  "/products/:id/duplicate",
  requirePermission("products.create"),
  validateParams(productIdParamSchema),
  productController.duplicate,
);

// ========== Product Option Routes ==========

// GET /products/:productId/options — list options for a product
router.get(
  "/products/:productId/options",
  requirePermission("products.view"),
  productOptionController.list,
);

// POST /products/:productId/options — create an option
router.post(
  "/products/:productId/options",
  requirePermission("variants.manage"),
  validateBody(createOptionSchema),
  productOptionController.create,
);

// PATCH /products/:productId/options/:optionId — update an option
router.patch(
  "/products/:productId/options/:optionId",
  requirePermission("variants.manage"),
  validateParams(productOptionIdParamSchema),
  validateBody(updateOptionSchema),
  productOptionController.update,
);

// DELETE /products/:productId/options/:optionId — delete an option
router.delete(
  "/products/:productId/options/:optionId",
  requirePermission("variants.manage"),
  validateParams(productOptionIdParamSchema),
  productOptionController.remove,
);

// ========== Option Value Routes ==========

// POST /products/:productId/options/:optionId/values — add a value
router.post(
  "/products/:productId/options/:optionId/values",
  requirePermission("variants.manage"),
  validateParams(productOptionIdParamSchema),
  validateBody(createOptionValueSchema),
  productOptionController.addValue,
);

// PATCH /products/:productId/options/:optionId/values/:valueId — update a value
router.patch(
  "/products/:productId/options/:optionId/values/:valueId",
  requirePermission("variants.manage"),
  validateParams(optionValueIdParamSchema),
  validateBody(updateOptionValueSchema),
  productOptionController.updateValue,
);

// DELETE /products/:productId/options/:optionId/values/:valueId — delete a value
router.delete(
  "/products/:productId/options/:optionId/values/:valueId",
  requirePermission("variants.manage"),
  validateParams(optionValueIdParamSchema),
  productOptionController.deleteValue,
);

// ========== Variant Routes ==========

// GET /products/:productId/variants — list variants for a product
router.get(
  "/products/:productId/variants",
  requirePermission("products.view"),
  productVariantController.list,
);

// POST /products/:productId/variants — create a variant
router.post(
  "/products/:productId/variants",
  requirePermission("variants.manage"),
  validateBody(createVariantSchema),
  productVariantController.create,
);

// POST /products/:productId/variants/generate — generate variants from options
router.post(
  "/products/:productId/variants/generate",
  requirePermission("variants.manage"),
  productVariantController.generate,
);

// GET /variants/:variantId — get variant by ID
router.get(
  "/variants/:variantId",
  requirePermission("products.view"),
  validateParams(inventoryVariantIdParamSchema),
  productVariantController.getById,
);

// PATCH /variants/:variantId — update variant
router.patch(
  "/variants/:variantId",
  requirePermission("variants.manage"),
  validateParams(inventoryVariantIdParamSchema),
  validateBody(updateVariantSchema),
  productVariantController.update,
);

// DELETE /variants/:variantId — delete variant
router.delete(
  "/variants/:variantId",
  requirePermission("variants.manage"),
  validateParams(inventoryVariantIdParamSchema),
  productVariantController.remove,
);

// PATCH /variants/:variantId/set-default — set variant as default
router.patch(
  "/variants/:variantId/set-default",
  requirePermission("variants.manage"),
  validateParams(inventoryVariantIdParamSchema),
  productVariantController.setDefault,
);

// ========== Inventory Routes ==========

// GET /inventory — list inventory (paginated)
router.get(
  "/inventory",
  requirePermission("inventory.view"),
  validateQuery(inventoryListQuerySchema),
  inventoryController.list,
);

// GET /inventory/low-stock — list low-stock items (BEFORE :variantId to avoid conflict)
router.get(
  "/inventory/low-stock",
  requirePermission("inventory.view"),
  inventoryController.getLowStock,
);

// GET /inventory/movements — list all inventory movements (BEFORE :variantId to avoid conflict)
router.get(
  "/inventory/movements",
  requirePermission("inventory.view"),
  validateQuery(movementListQuerySchema),
  inventoryController.listMovements,
);

// GET /inventory/:variantId — get inventory for a variant
router.get(
  "/inventory/:variantId",
  requirePermission("inventory.view"),
  validateParams(inventoryVariantIdParamSchema),
  inventoryController.getByVariantId,
);

// POST /inventory/:variantId/adjust — adjust inventory
router.post(
  "/inventory/:variantId/adjust",
  requirePermission("inventory.adjust"),
  validateParams(inventoryVariantIdParamSchema),
  validateBody(adjustInventorySchema),
  inventoryController.adjust,
);

// GET /inventory/:variantId/movements — get movements for a variant
router.get(
  "/inventory/:variantId/movements",
  requirePermission("inventory.view"),
  validateParams(inventoryVariantIdParamSchema),
  inventoryController.getVariantMovements,
);

// ========== Media Routes ==========

// POST /products/:productId/media — upload media (with multer)
router.post(
  "/products/:productId/media",
  requirePermission("products.update"),
  upload.single("file"),
  productMediaController.upload,
);

// PATCH /products/:productId/media/reorder — reorder media (BEFORE :id to avoid conflict)
router.patch(
  "/products/:productId/media/reorder",
  requirePermission("products.update"),
  validateBody(reorderMediaSchema),
  productMediaController.reorder,
);

// PATCH /products/:productId/media/:id — update media alt text
router.patch(
  "/products/:productId/media/:id",
  requirePermission("products.update"),
  validateParams(productMediaIdParamSchema),
  validateBody(updateMediaSchema),
  productMediaController.updateAltText,
);

// DELETE /products/:productId/media/:id — delete media
router.delete(
  "/products/:productId/media/:id",
  requirePermission("products.update"),
  validateParams(productMediaIdParamSchema),
  productMediaController.remove,
);

export default router;
