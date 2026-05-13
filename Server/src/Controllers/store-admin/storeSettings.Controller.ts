import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { storeSettingsService } from "../../services/store-admin/storeSettings.Service";
import { AppRequest } from "../../types";

/**
 * StoreSettingsController handles store settings endpoints.
 * All handlers are wrapped with asyncHandler for centralized error handling.
 */

/**
 * GET /settings
 * Returns the full store settings for the current store context.
 */
export const getSettings = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const store = await storeSettingsService.getSettings(storeId);

    sendSuccess(res, { store }, "Store settings retrieved");
  },
);

/**
 * PATCH /settings/general
 * Updates general settings: name, currency_code, locale, timezone.
 */
export const updateGeneral = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const store = await storeSettingsService.updateGeneral(storeId, req.body);

    sendSuccess(res, { store }, "General settings updated");
  },
);

/**
 * PATCH /settings/branding
 * Updates branding settings: logo, favicon, description.
 */
export const updateBranding = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const store = await storeSettingsService.updateBranding(storeId, req.body);

    sendSuccess(res, { store }, "Branding settings updated");
  },
);

/**
 * PATCH /settings/seo
 * Updates SEO settings: meta_title, meta_description.
 */
export const updateSeo = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const store = await storeSettingsService.updateSeo(storeId, req.body);

    sendSuccess(res, { store }, "SEO settings updated");
  },
);

/**
 * PATCH /settings/contact
 * Updates contact info: support_email, support_phone, facebook_url, instagram_url, tiktok_url.
 */
export const updateContact = asyncHandler(
  async (req: AppRequest, res: Response) => {
    const storeId = req.storeId!;
    const store = await storeSettingsService.updateContact(storeId, req.body);

    sendSuccess(res, { store }, "Contact settings updated");
  },
);
