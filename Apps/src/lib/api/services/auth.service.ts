/**
 * Auth Service
 * Handles authentication, registration, password management, and store creation.
 */

import { apiClient, setAccessToken } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  User,
} from "@/types";

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  password: string;
}

export interface CreateStorePayload {
  name: string;
  domain: string;
}

export const authService = {
  login(payload: LoginPayload) {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: payload,
    });
  },

  register(payload: RegisterPayload) {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: payload,
    });
  },

  logout() {
    return apiClient<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT, {
      method: "POST",
    }).then((res) => {
      setAccessToken(null);
      return res;
    });
  },

  getProfile() {
    return apiClient<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME);
  },

  refresh() {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
    });
  },

  changePassword(payload: ChangePasswordPayload) {
    return apiClient<ApiResponse<null>>(`${API_ENDPOINTS.AUTH.ME}/password`, {
      method: "PUT",
      body: payload,
    });
  },

  forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient<ApiResponse<null>>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: "POST",
      body: payload,
    });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return apiClient<ApiResponse<null>>(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: "POST",
      body: payload,
    });
  },

  createStore(payload: CreateStorePayload) {
    return apiClient<ApiResponse<{ id: number; name: string; domain: string }>>(
      "/stores",
      {
        method: "POST",
        body: payload,
      },
    );
  },
};
