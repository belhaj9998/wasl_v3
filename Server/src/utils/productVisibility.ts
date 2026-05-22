/**
 * Public storefront products must be directly purchasable:
 * - simple products use their default variant internally;
 * - configurable products need at least one active, non-default variant.
 */
export const storefrontPurchasableProductWhere = {
  OR: [
    { has_variants: false },
    {
      has_variants: true,
      variants: {
        some: {
          is_active: true,
          is_default: false,
        },
      },
    },
  ],
};

export function getStorefrontVisibleVariants<
  TVariant extends { is_default: boolean },
>(hasVariants: boolean, variants: TVariant[]) {
  return hasVariants
    ? variants.filter((variant) => !variant.is_default)
    : variants;
}
