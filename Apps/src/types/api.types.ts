/**
 * API Response Types
 * Standard response wrappers for all API communication
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
  statusCode?: number;
}

export interface ValidationError {
  path: string;
  message: string;
}
