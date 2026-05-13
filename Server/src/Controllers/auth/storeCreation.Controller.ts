import { Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/apiResponse";
import { storeCreationService } from "../../services/storeCreation.Service";
import { AppRequest } from "../../types";

/**
 * Store Creation Controller
 * Handles store creation requests from authenticated users.
 */
export const create = asyncHandler(async (req: AppRequest, res: Response) => {
  const userId = req.user!.userId;
  const data = req.body;

  const store = await storeCreationService.createStore(userId, data);

  sendSuccess(res, store, "Store created successfully", 201);
});
