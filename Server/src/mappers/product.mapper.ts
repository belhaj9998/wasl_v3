import { asArray, money, RawRecord, timestamp } from "./mapper.utils";

function nullableMoney(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return money(value);
}

export function mapCategoryToDto(categoryOrLink: RawRecord) {
  const category = categoryOrLink.category ?? categoryOrLink;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    parent_id: category.parent_id ?? null,
    image_url: category.image_url ?? null,
    sort_order: category.sort_order ?? 0,
    is_active: category.is_active ?? true,
    children: Array.isArray(category.children)
      ? category.children.map(mapCategoryToDto)
      : undefined,
    product_count: category.product_count,
  };
}

export function mapProductMediaToDto(media: RawRecord) {
  return {
    id: media.id,
    url: media.url,
    alt_text: media.alt_text ?? null,
    sort_order: media.sort_order ?? 0,
  };
}

export function mapOptionValueToDto(valueOrLink: RawRecord) {
  const value = valueOrLink.option_value ?? valueOrLink;

  return {
    id: value.id,
    value: value.value,
    position: value.position ?? 0,
  };
}

export function mapProductOptionToDto(option: RawRecord) {
  return {
    id: option.id,
    name: option.name,
    position: option.position ?? 0,
    values: asArray(option.values).map(mapOptionValueToDto),
  };
}

function mapInventoryToDto(inventory: RawRecord | null | undefined) {
  if (!inventory) {
    return undefined;
  }

  return {
    variant_id: inventory.variant_id,
    available_quantity: inventory.available_quantity ?? 0,
    total_quantity: inventory.total_quantity ?? 0,
    reserved_quantity: inventory.reserved_quantity ?? 0,
    low_stock_threshold: inventory.low_stock_threshold ?? 0,
  };
}

export function mapProductVariantToDto(variant: RawRecord) {
  return {
    id: variant.id,
    product_id: variant.product_id,
    title: variant.title,
    sku: variant.sku,
    barcode: variant.barcode ?? null,
    price: nullableMoney(variant.price),
    compare_at_price: nullableMoney(variant.compare_at_price),
    is_default: variant.is_default ?? false,
    is_active: variant.is_active ?? true,
    option_values: asArray(variant.option_values).map(mapOptionValueToDto),
    inventory: mapInventoryToDto(variant.inventory),
  };
}

export function mapProductToDto(product: RawRecord) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description ?? null,
    short_description: product.short_description ?? null,
    status: product.status,
    base_price: money(product.base_price),
    compare_at_price: nullableMoney(product.compare_at_price),
    cost_price: nullableMoney(product.cost_price),
    track_inventory: product.track_inventory ?? true,
    has_variants: product.has_variants ?? false,
    is_published: product.is_published ?? false,
    published_at: timestamp(product.published_at),
    categories: asArray(product.categories).map(mapCategoryToDto),
    media: asArray(product.media).map(mapProductMediaToDto),
    options: asArray(product.options).map(mapProductOptionToDto),
    variants: asArray(product.variants).map(mapProductVariantToDto),
    created_at: timestamp(product.created_at),
    updated_at: timestamp(product.updated_at),
  };
}
