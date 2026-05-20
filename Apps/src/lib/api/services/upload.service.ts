/**
 * Upload Service
 * File and image upload operations.
 */

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/constants";
import type { ApiResponse } from "@/types";

export interface UploadResult {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimetype: string;
}

export const uploadService = {
  uploadImage(storeId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<ApiResponse<{ file: UploadResult }>>(
      API_ENDPOINTS.UPLOAD.IMAGE,
      {
        method: "POST",
        body: formData,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.file }) as ApiResponse<UploadResult>,
    );
  },

  uploadFile(storeId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<ApiResponse<{ file: UploadResult }>>(
      API_ENDPOINTS.UPLOAD.FILE,
      {
        method: "POST",
        body: formData,
        storeId,
      },
    ).then(
      (res) => ({ ...res, data: res.data.file }) as ApiResponse<UploadResult>,
    );
  },

  deleteFile(storeId: number, fileKey: string) {
    return apiClient<ApiResponse<null>>(API_ENDPOINTS.UPLOAD.DELETE(fileKey), {
      method: "DELETE",
      storeId,
    });
  },
};