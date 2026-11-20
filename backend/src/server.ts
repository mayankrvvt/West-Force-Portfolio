import type { Server } from "node:http";
import { configuredOrigins, createApp } from "./app";
import { config } from "./lib/config";
import { connectDB, disconnectDB } from "./lib/db";
import { logger } from "./lib/logger";
// Start Firebase Admin at boot so bad credentials fail fast.
import "./lib/clients/firebase";

const SHUTDOWN_TIMEOUT_MS = 10_000;

let shuttingDown = false;

function shutdown(server: Server, signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "Shutting down");

  // Hard exit if open connections keep us alive too long.
  setTimeout(() => {
    logger.error("Shutdown timed out; forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();

  server.close((closeError) => {
    if (closeError) {
      logger.error({ err: closeError }, "Error while closing HTTP server");
    }

    disconnectDB()
      .then(() => {
        logger.info("Shutdown complete");
        process.exit(closeError ? 1 : 0);
      })
      .catch((error: unknown) => {
        logger.error({ err: error }, "Error while closing MongoDB");
        process.exit(1);
      });
  });

  // Let idle keep-alive sockets go so close() can finish.
  server.closeIdleConnections();
}

async function start(): Promise<void> {
  await connectDB(config.MONGODB_URI);

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    logger.info(
      {
        port: config.PORT,
        geminiModel: config.GEMINI_CHAT_MODEL,
        geminiConfigured: Boolean(config.GEMINI_API_KEY),
        corsOrigins: configuredOrigins(),
        vercelPreviews: true,
      },
      `WestForce API running on http://localhost:${config.PORT}`
    );
  });

  process.once("SIGTERM", () => shutdown(server, "SIGTERM"));
  process.once("SIGINT", () => shutdown(server, "SIGINT"));
}

start().catch((error: unknown) => {
  logger.fatal(
    { reason: error instanceof Error ? error.message : String(error) },
    "Failed to start WestForce server"
  );
  process.exit(1);
});
