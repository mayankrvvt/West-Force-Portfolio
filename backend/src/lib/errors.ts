import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from "express";
import { config } from "./config";
import { logger } from "./logger";

/** An error whose status and message are safe to send to the client. */
export class AppError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    status: number,
    message: string,
    options: { code?: string; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "AppError";
    this.status = status;
    this.code = options.code;
  }
}

/** Run an async fn; if it throws anything, throw an AppError(500, message) instead. */
export async function failWith<T>(message: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, message, { cause: error });
  }
}

/*
 * Gemini SDK timeouts surface as AbortError (fetch) or TimeoutError
 * (AbortSignal.timeout); also check the wrapped cause.
 */
export function isTimeoutError(error: unknown): boolean {
  const names = ["AbortError", "TimeoutError"];
  const err = error as { name?: unknown; cause?: { name?: unknown } } | null;

  return names.includes(String(err?.name)) || names.includes(String(err?.cause?.name));
}

/** Like failWith, but an AI timeout becomes a 504. Real errors are only logged. */
export async function failWithAi<T>(message: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AppError) throw error;

    if (isTimeoutError(error)) {
      throw new AppError(504, "The AI took too long. Please try again.", { cause: error });
    }

    throw new AppError(500, message, { cause: error });
  }
}

type AsyncHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/** Pass rejected promises to the error handler (Express 5 does this too; this keeps it explicit). */
export function asyncHandler<Req extends Request = Request>(
  fn: AsyncHandler<Req>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as Req, res, next)).catch(next);
  };
}

/** Send the standard error body: { success: false, message, code?, requestId }. */
export function sendError(
  req: Request,
  res: Response,
  status: number,
  message: string,
  code?: string
): Response {
  return res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
    requestId: req.id,
  });
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found.",
    requestId: req.id,
  });
};

function errorStatus(error: unknown): number {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" && Number.isInteger(status) ? status : 500;
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const log = req.log ?? logger;

  if (error instanceof AppError) {
    if (error.status >= 500) {
      log.error({ err: error }, error.message);
    }

    const detail =
      config.NODE_ENV === "development" && error.cause instanceof Error
        ? { error: error.cause.message }
        : {};

    res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
      requestId: req.id,
      ...detail,
    });
    return;
  }

  // Anything else (body-parser, CORS, bugs): show 4xx messages, hide 5xx details.
  const raw = errorStatus(error);
  const status = raw >= 400 && raw < 500 ? raw : 500;

  if (status >= 500) {
    log.error({ err: error }, "WestForce server error");
  } else {
    log.warn({ err: error }, "Request error");
  }

  res.status(status).json({
    success: false,
    message:
      status < 500 && error instanceof Error
        ? error.message
        : "Internal server error.",
    requestId: req.id,
  });
};
