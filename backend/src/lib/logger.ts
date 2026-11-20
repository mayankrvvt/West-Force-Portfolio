import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { config } from "./config";

export const logger = pino({
  level:
    config.LOG_LEVEL ?? (config.NODE_ENV === "test" ? "silent" : "info"),
  base: { service: "westforce-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'req.headers["stripe-signature"]',
      'res.headers["set-cookie"]',
    ],
    censor: "[redacted]",
  },
});

export const REQUEST_ID_HEADER = "X-Request-Id";

// Accept a caller's id only if it is short and plain, so it is safe to log and echo.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(
  req: IncomingMessage,
  res: ServerResponse
): string {
  const incoming = req.headers["x-request-id"];
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  const id =
    candidate && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID();

  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

export const httpLogger = pinoHttp({
  logger,
  genReqId: resolveRequestId,
  customLogLevel: (_req, res, error) => {
    if (error || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  // Uptime checks hit these often; keep them out of the logs.
  autoLogging: {
    ignore: (req) =>
      req.url === "/api/health" || req.url === "/api/health/ready",
  },
});
