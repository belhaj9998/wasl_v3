import { SystemRole } from "../../generated/prisma";

export interface AccessTokenPayload {
  userId: number;
  systemRole: SystemRole;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: number;
  iat: number;
  exp: number;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  system_role: SystemRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  avatar_url?: string;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordInput {
  token: string;
  new_password: string;
}
