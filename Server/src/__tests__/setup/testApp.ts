import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { uploadConfig } from "../../configs/upload.config";
import { globalRateLimiter } from "../../middlewares/rateLimiter.Middleware";
import { errorHandler } from "../../middlewares/error.Middleware";
import router from "../../routes/index";
import { prisma } from "./testDatabase";

/**
 * Creates an Express app instance identical to production
 * but without calling app.listen().
 * Used with Supertest for integration tests.
 */
const app = express();

// --- Middleware Pipeline (mirrors src/index.ts) ---

// 1. Security headers
app.use(helmet());

// 2. Rate limiting
app.use(globalRateLimiter);

// 3. HTTP request logging (silent in test to reduce noise)
app.use(morgan("combined", { skip: () => true }));

// 4. CORS
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// 5. JSON body parser with configurable size limit
app.use(express.json({ limit: "10mb" }));

// 6. URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// 7. Cookie parser
app.use(cookieParser());

// 8. Static file serving for uploads
app.use("/uploads", express.static(uploadConfig.uploadsDir));

// --- Routes ---
app.use(router);

// --- Error Handler (must be last) ---
app.use(errorHandler);

export { app, prisma };
