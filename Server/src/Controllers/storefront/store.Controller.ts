import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess, sendPaginated } from "../../utils/apiResponse";
import { storefrontStoreService } from "../../services/storefront/store.Service";
import { StorefrontRequest } from "../../types/storefront.types";

/**
 * StorefrontStoreController handles public store information and category
 * browsing endpoints for the customer-facing storefront.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /api/storefront/:domain
 * Returns the store's public profile including name, logo, description,
 * social links, support contact, and SEO metadata.
 */
export const getStoreInfo = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;

    const store = await storefrontStoreService.getStoreInfo(storeId);

    sendSuccess(res, { store }, "Store info retrieved");
  },
);

/**
 * GET /api/storefront/:domain/categories
 * Returns all active categories as a nested tree ordered by sort_order.
 */
export const listCategories = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;

    const categories = await storefrontStoreService.listCategories(storeId);

    sendSuccess(res, { categories }, "Categories retrieved");
  },
);

/**
 * GET /api/storefront/:domain/categories/:slug
 * Returns a category by slug with its published products, paginated.
 */
export const getCategoryBySlug = asyncHandler(
  async (req: StorefrontRequest, res: Response) => {
    const storeId = req.store!.id;
    const slug = req.params.slug as string;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const result = await storefrontStoreService.getCategoryBySlug(
      storeId,
      slug,
      page,
      limit,
    );

    sendPaginated(
      res,
      result.products.data,
      result.products.meta,
      "Category products retrieved",
    );
  },
);
