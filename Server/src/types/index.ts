import { Request } from "express";
import { SystemRole } from "../../generated/prisma";

export interface AppRequest extends Request {
  user?: {
    userId: number;
    email?: string;
    phone?: string;
    systemRole?: SystemRole;
  };
  storeId?: number;
  storeRole?: string;
  permissions?: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | Record<string, string[]>;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
