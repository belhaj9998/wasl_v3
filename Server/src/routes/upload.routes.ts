import { Router } from "express";
import {
  verifyToken,
  resolveStoreContext,
} from "../middlewares/auth.Middleware";
import * as uploadController from "../controllers/shared/upload.Controller";

const router = Router();

// Apply verifyToken and resolveStoreContext to ALL upload routes
router.use(verifyToken, resolveStoreContext);

// POST /image — upload and optimize an image
router.post("/image", uploadController.uploadImage);

// POST /file — upload a general file (documents, PDFs, etc.)
router.post("/file", uploadController.uploadFile);

// DELETE /:key(*) — delete a previously uploaded file by key
router.delete("/*key", uploadController.deleteFile);

export default router;
