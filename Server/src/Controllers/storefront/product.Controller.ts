import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { storefrontProductService } from "../../services/storefront/product.Service";
import { StorefrontRequest } from "../../types/storefront.types";
import {
  productListQuerySchema,
  productSearchQuerySchema,
} from "../../validators/storefront.validators";

/**
 * StorefrontProductController handles public product browsing endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/storefront/:domain/products
 * Returns a paginated list of published products with filtering and sorting.
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export const listProducts = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;

    const params = productListQuerySchema.parse(req.query);

    const result = await storefrontProductService.listProducts(storeId, {
      page: params.page,
      limit: params.limit,
      category_id: params.category_id,
      min_price: params.min_price,
      max_price: params.max_price,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
    });

    sendPaginated(res, result.data, result.meta, "Products retrieved");
  },
);

/**
 * GET /api/storefront/:domain/products/:slug
 * Returns a product by slug with active variants, media, and inventory.
 * Requirements: 5.5, 5.6
 */
export const getProductBySlug = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const slug = req.params.slug as string;

    const product = await storefrontProductService.getProductBySlug(
      storeId,
      slug,
    );

    sendSuccess(res, { product }, "Product retrieved");
  },
);

/**
 * GET /api/storefront/:domain/products/search
 * Searches products by name, description, and variant SKU.
 * Requirements: 5.7
 */
export const searchProducts = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;

    const params = productSearchQuerySchema.parse(req.query);

    const result = await storefrontProductService.searchProducts(
      storeId,
      params.query,
      params.page,
      params.limit,
    );

    sendPaginated(res, result.data, result.meta, "Search results retrieved");
  },
);
