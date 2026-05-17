import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  appName: string;
  databaseUrl: string;

  // JWT
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;

  // Customer JWT (separate from admin)
  customerJwtSecret: string;
  customerJwtExpiry: string;

  // Security
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  corsOrigins: string[];
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  appName: process.env.APP_NAME || "Wasl_SaaS",
  databaseUrl: process.env.DATABASE_URL || "",

  // JWT
  jwtSecret: process.env.JWT_SECRET || "",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "",
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || "7d",
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",

  // Customer JWT (separate from admin)
  customerJwtSecret: process.env.CUSTOMER_JWT_SECRET || "",
  customerJwtExpiry: process.env.CUSTOMER_JWT_EXPIRY || "7d",

  // Security
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 12,
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
};
