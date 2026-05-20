/**
 * Auth Service
 * Handles authentication, registration, password management, and store creation.
 */
import {
  apiClient,
  setAccessToken,
  setCustomerToken,
  setSuppressSessionExpiredRedirect,
} from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type {
  ApiResponse,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
  Store,
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
interface ProfileResponse {
  user: User;
}

interface CreateStoreApiResponse {
  store: Store;
  roles: unknown[];
  membership: unknown;
  subscription: unknown;
}
export const authService = {
  login(payload: LoginPayload) {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.LOGIN, {
      method: "POST",
      body: payload,
      skipAuthRedirect: true,
    }).then((res) => {
      setSuppressSessionExpiredRedirect(false);
      return res;
    });
  },

  register(payload: RegisterPayload) {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REGISTER, {
      method: "POST",
      body: payload,
      skipAuthRedirect: true,
    }).then((res) => {
      setSuppressSessionExpiredRedirect(false);
      return res;
    });
  },

  async logout() {
    setSuppressSessionExpiredRedirect(true);

    try {
      return await apiClient<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT, {
        method: "POST",
        skipAuthRedirect: true,
      });
    } finally {
      setAccessToken(null);
      setCustomerToken(null);
    }
  },

  getProfile() {
    return apiClient<ApiResponse<ProfileResponse>>(API_ENDPOINTS.AUTH.ME).then(
      (res) => ({ ...res, data: res.data.user }) as ApiResponse<User>,
    );
  },

  refresh() {
    return apiClient<ApiResponse<AuthResponse>>(API_ENDPOINTS.AUTH.REFRESH, {
      method: "POST",
    });
  },

  changePassword(payload: ChangePasswordPayload) {
    return apiClient<ApiResponse<null>>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: "POST",
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
      body: {
        token: payload.token,
        new_password: payload.password,
      },
    });
  },

  createStore(payload: CreateStorePayload) {
    return apiClient<ApiResponse<CreateStoreApiResponse>>(
      API_ENDPOINTS.AUTH.CREATE_STORE,
      {
        method: "POST",
        body: payload,
      },
    ).then((res) => ({ ...res, data: res.data.store }) as ApiResponse<Store>);
  },
};
