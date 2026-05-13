import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "./configs/App.config";
import { uploadConfig } from "./configs/upload.config";
import { globalRateLimiter } from "./middlewares/rateLimiter.Middleware";
import { errorHandler } from "./middlewares/error.Middleware";
import router from "./routes/index";
import { registerGracefulShutdown } from "./utils/gracefulShutdown";

const app = express();

// --- Middleware Pipeline (order matters) ---

// 1. Security headers
app.use(helmet());

// 2. Rate limiting
app.use(globalRateLimiter);

// 3. HTTP request logging
app.use(morgan(config.nodeEnv === "production" ? "combined" : "dev"));

// 4. CORS
app.use(
  cors({
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : "*",
    credentials: true,
  }),
);

// 5. JSON body parser with configurable size limit
app.use(express.json({ limit: "10mb" }));

// 6. URL-encoded body parser
app.use(express.urlencoded({ extended: true }));

// 7. Cookie parser
app.use(cookieParser());

// 8. Static file serving for uploads (unauthenticated, local development)
app.use("/uploads", express.static(uploadConfig.uploadsDir));

// --- Routes ---
app.use(router);

// --- Error Handler (must be last) ---
app.use(errorHandler);

// --- Process-level error handlers ---
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
  process.exit(1);
});

// --- Start server ---
const PORT = config.port;

const server = app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`${config.appName} is running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`http://localhost:${PORT}`);
});

// --- Graceful Shutdown ---
registerGracefulShutdown(server);
