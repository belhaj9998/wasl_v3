/**
 * Upload Service
 * File and image upload operations.
 */

import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types";

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mime_type: string;
}

export const uploadService = {
  uploadImage(storeId: number, file: File) {
    const formData = new FormData();
    formData.append("image", file);

    return apiClient<ApiResponse<UploadResult>>(
      `/stores/${storeId}/uploads/images`,
      {
        method: "POST",
        body: formData as unknown,
        storeId,
        headers: {
          // Let browser set Content-Type with boundary for multipart
          "Content-Type": "",
        },
      },
    );
  },

  uploadFile(storeId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient<ApiResponse<UploadResult>>(
      `/stores/${storeId}/uploads/files`,
      {
        method: "POST",
        body: formData as unknown,
        storeId,
        headers: {
          // Let browser set Content-Type with boundary for multipart
          "Content-Type": "",
        },
      },
    );
  },

  deleteFile(storeId: number, fileKey: string) {
    return apiClient<ApiResponse<null>>(
      `/stores/${storeId}/uploads/${encodeURIComponent(fileKey)}`,
      {
        method: "DELETE",
        storeId,
      },
    );
  },
};
