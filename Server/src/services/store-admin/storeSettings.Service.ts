import prisma from "../../configs/prisma";
import { AppError } from "../../utils/AppError";

/**
 * StoreSettingsService handles retrieval and partial updates of store
 * configuration: general settings, branding, SEO metadata, and contact info.
 */
export class StoreSettingsService {
  /**
   * Fetches the full Store record by ID.
   * Throws 404 if the store does not exist.
   */
  async getSettings(storeId: number) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      console.log("erroe bta# store");
      throw AppError.notFound("Store not found");
    }

    return store;
  }

  /**
   * Partial update of general settings: name, currency_code, locale, timezone.
   * Returns the updated Store record.
   */
  async updateGeneral(
    storeId: number,
    data: {
      name?: string;
      currency_code?: string;
      locale?: string;
      timezone?: string;
    },
  ) {
    await this.ensureStoreExists(storeId);

    const store = await prisma.store.update({
      where: { id: storeId },
      data,
    });

    return store;
  }

  /**
   * Partial update of branding settings: logo, favicon, description.
   * Returns the updated Store record.
   */
  async updateBranding(
    storeId: number,
    data: {
      logo?: string | null;
      favicon?: string | null;
      description?: string | null;
    },
  ) {
    await this.ensureStoreExists(storeId);

    const store = await prisma.store.update({
      where: { id: storeId },
      data,
    });

    return store;
  }

  /**
   * Partial update of SEO settings: meta_title, meta_description.
   * Returns the updated Store record.
   */
  async updateSeo(
    storeId: number,
    data: {
      meta_title?: string | null;
      meta_description?: string | null;
    },
  ) {
    await this.ensureStoreExists(storeId);

    const store = await prisma.store.update({
      where: { id: storeId },
      data,
    });

    return store;
  }

  /**
   * Partial update of contact information: support_email, support_phone,
   * facebook_url, instagram_url, tiktok_url.
   * Returns the updated Store record.
   */
  async updateContact(
    storeId: number,
    data: {
      support_email?: string | null;
      support_phone?: string | null;
      facebook_url?: string | null;
      instagram_url?: string | null;
      tiktok_url?: string | null;
    },
  ) {
    await this.ensureStoreExists(storeId);

    const store = await prisma.store.update({
      where: { id: storeId },
      data,
    });

    return store;
  }

  /**
   * Verifies that a store exists. Throws 404 if not found.
   */
  private async ensureStoreExists(storeId: number): Promise<void> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw AppError.notFound("Store not found");
    }
  }
}

export const storeSettingsService = new StoreSettingsService();
