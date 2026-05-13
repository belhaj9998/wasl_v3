import type { Server } from "http";
import prisma from "../configs/prisma";

const SHUTDOWN_TIMEOUT = 30_000; // 30 seconds for in-flight requests
const PRISMA_DISCONNECT_TIMEOUT = 5_000; // 5 seconds for Prisma disconnect

let isShuttingDown = false;

/**
 * Registers SIGTERM and SIGINT listeners for graceful shutdown.
 * Stops accepting new connections, waits for in-flight requests,
 * disconnects Prisma, and exits cleanly.
 */
export function registerGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(
      `\n[Shutdown] Received ${signal}. Starting graceful shutdown...`,
    );

    // Step 1: Stop accepting new connections
    server.close(() => {
      console.log(
        "[Shutdown] HTTP server closed — no longer accepting connections.",
      );
    });

    // Step 2: Wait for in-flight requests to complete (max 30s)
    const shutdownTimer = setTimeout(() => {
      console.error(
        "[Shutdown] Timeout waiting for in-flight requests. Force closing...",
      );
      disconnectPrisma(1);
    }, SHUTDOWN_TIMEOUT);

    server.close(async () => {
      clearTimeout(shutdownTimer);
      console.log("[Shutdown] All in-flight requests completed.");
      await disconnectPrisma(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Disconnects Prisma with a timeout and exits the process.
 */
async function disconnectPrisma(exitCode: number): Promise<void> {
  console.log("[Shutdown] Disconnecting Prisma client...");

  const prismaTimer = setTimeout(() => {
    console.error(
      "[Shutdown] Prisma disconnect timed out. Force exiting with code 1.",
    );
    process.exit(1);
  }, PRISMA_DISCONNECT_TIMEOUT);

  try {
    await prisma.$disconnect();
    clearTimeout(prismaTimer);
    console.log("[Shutdown] Prisma client disconnected.");
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(prismaTimer);
    console.error("[Shutdown] Error disconnecting Prisma:", error);
    process.exit(1);
  }
}
