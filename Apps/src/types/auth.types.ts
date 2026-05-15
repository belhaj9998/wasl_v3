/**
 * Authentication & User Types
 */

export type SystemRole =
  | "USER"
  | "SUPPORT"
  | "PLATFORM_ADMIN"
  | "PLATFORM_OWNER";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  system_role: SystemRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface StoreContext {
  storeId: number;
  permissions: string[];
}
