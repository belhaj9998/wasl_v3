import { AppRequest } from "./index";
import { PaymentMethod, StoreStatus } from "../../generated/prisma";

// ─── Store context attached by storefrontTenantMiddleware ───

export interface StorefrontStoreContext {
  id: number;
  name: string;
  domain: string;
  currency_code: string;
  locale: string;
  status: StoreStatus;
}

// ─── Customer context attached by optionalAuth / requireCustomerAuth ───

export interface StorefrontCustomerContext {
  customerId: number;
  phone: string;
  store_id: number;
}

// ─── Extended request for storefront routes ───

export interface StorefrontRequest extends AppRequest {
  store?: StorefrontStoreContext;
  customer?: StorefrontCustomerContext;
  sessionId?: string;
}

// ─── Customer JWT payload (separate from admin User JWT) ───

export interface CustomerJwtPayload {
  customerId: number;
  phone: string;
  storeId: number;
  iat?: number;
  exp?: number;
}

// ─── Cart identification ───

export interface CartIdentifier {
  storeId: number;
  customerId?: number;
  sessionId?: string;
}

// ─── Cart item input ───

export interface AddToCartInput {
  product_id: number;
  variant_id: number;
  quantity: number;
}

// ─── Checkout input ───

export interface CreateCheckoutInput {
  customer_name: string;
  customer_phone: string;

  shipping_address: {
    full_name: string;
    phone?: string;
    city: string;
    region?: string;
    street_line_1: string;
    street_line_2?: string;
    postal_code?: string;
    google_maps_url?: string;
  };

  payment_method: PaymentMethod;

  notes_from_customer?: string;
  coupon_code?: string;
}

// ─── Customer registration input ───

export interface CustomerRegistrationInput {
  first_name: string;
  last_name?: string;
  phone: string;
  password: string;
}
