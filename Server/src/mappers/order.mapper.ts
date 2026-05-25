import { asArray, money, RawRecord, timestamp } from "./mapper.utils";

function actorName(actor: RawRecord | null | undefined): string | null {
  if (!actor) {
    return null;
  }

  const name = [actor.customer_name, actor.last_name].filter(Boolean).join(" ");
  return actor.customer_name ? String(actor.customer_name) : null;
}

function mapCustomer(customer: RawRecord | null | undefined) {
  if (!customer) {
    return null;
  }

  return {
    id: customer.id,
    customer_name: customer.customer_name ?? null,
    phone: customer.phone ?? null,
  };
}

function mapAddress(address: RawRecord | null | undefined) {
  if (!address) {
    return null;
  }

  return {
    id: address.id,
    type: address.type,
    full_name: address.full_name,
    phone: address.phone ?? null,
    city: address.city,
    region: address.region ?? null,
    state: address.state ?? address.region ?? null,
    street_line_1: address.street_line_1,
    street_line_2: address.street_line_2 ?? null,
    postal_code: address.postal_code ?? null,
    google_maps_url: address.google_maps_url ?? null,
  };
}

function mapOrderItem(item: RawRecord) {
  return {
    id: item.id,
    product_id: item.product_id,
    variant_id: item.variant_id,
    product_name: item.product_name,
    variant_title: item.variant_title ?? null,
    sku: item.sku,
    quantity: item.quantity,
    unit_price: money(item.unit_price),
    discount_amount: money(item.discount_amount ?? item.discount_total),
    total_price: money(item.total_price ?? item.line_total),
    metadata: item.metadata ?? null,
  };
}

function mapPayment(payment: RawRecord) {
  return {
    id: payment.id,
    method: payment.method,
    status: payment.status,
    amount: money(payment.amount),
    currency: payment.currency ?? payment.currency_code,
    provider: payment.provider ?? null,
    transaction_reference: payment.transaction_reference ?? null,
    payment_link: payment.payment_link ?? null,
    paid_at: timestamp(payment.paid_at),
    created_at: timestamp(payment.created_at),
    updated_at: timestamp(payment.updated_at),
  };
}

function mapShipment(shipment: RawRecord) {
  return {
    id: shipment.id,
    status: shipment.status,
    provider: shipment.provider,
    service_name: shipment.service_name ?? null,
    tracking_number: shipment.tracking_number ?? null,
    shipping_cost: money(shipment.shipping_cost),
    shipped_at: timestamp(shipment.shipped_at),
    delivered_at: timestamp(shipment.delivered_at),
    expected_delivery_at: timestamp(shipment.expected_delivery_at),
    created_at: timestamp(shipment.created_at),
    updated_at: timestamp(shipment.updated_at),
  };
}

export function mapOrderTimelineToDto(event: RawRecord) {
  return {
    id: event.id,
    event: event.event,
    description: event.description ?? event.note ?? null,
    note: event.note ?? null,
    from_status: event.from_status ?? null,
    to_status: event.to_status ?? null,
    actor_user_id: event.actor_user_id ?? null,
    actor_name: event.actor_name ?? actorName(event.actor),
    payload: event.payload ?? null,
    created_at: timestamp(event.created_at),
  };
}

function mapInternalNote(event: ReturnType<typeof mapOrderTimelineToDto>) {
  return {
    id: event.id,
    content: event.note ?? event.description ?? "",
    actor_name: event.actor_name,
    created_at: event.created_at,
  };
}

export function mapOrderToDto(order: RawRecord) {
  const addresses = asArray(order.addresses).map(mapAddress).filter(Boolean);
  const payments = asArray(order.payments).map(mapPayment);
  const shipments = asArray(order.shipments).map(mapShipment);
  const timeline = asArray(order.timeline).map(mapOrderTimelineToDto);

  const shippingAddress =
    mapAddress(order.shipping_address) ??
    addresses.find((address) => address?.type === "SHIPPING") ??
    addresses[0] ??
    null;

  const billingAddress =
    mapAddress(order.billing_address) ??
    addresses.find((address) => address?.type === "BILLING") ??
    null;

  return {
    id: order.id,
    store_id: order.store_id,
    customer_id: order.customer_id ?? null,
    cart_id: order.cart_id ?? null,
    order_number: order.order_number,
    source: order.source,
    status: order.status,
    payment_status: order.payment_status,
    currency: order.currency ?? order.currency_code ?? "LYD",
    subtotal: money(order.subtotal),
    discount_amount: money(order.discount_amount ?? order.discount_total),
    shipping_amount: money(order.shipping_amount ?? order.shipping_total),
    total: money(order.total ?? order.grand_total),
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email ?? null,
    customer: mapCustomer(order.customer),
    shipping_address: shippingAddress,
    billing_address: billingAddress,
    addresses,
    payment_method: order.payment_method ?? payments[0]?.method ?? null,
    notes_from_customer: order.notes_from_customer ?? null,
    notes_internal: order.notes_internal ?? null,
    internal_notes: timeline
      .filter((event) => event.event === "NOTE_ADDED")
      .map(mapInternalNote),
    items: asArray(order.items).map(mapOrderItem),
    payments,
    shipments,
    timeline,
    created_at: timestamp(order.created_at ?? order.placed_at),
    placed_at: timestamp(order.placed_at ?? order.created_at),
    updated_at: timestamp(order.updated_at),
  };
}
