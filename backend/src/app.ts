import cors, { type CorsOptions } from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { config, logClientIpEnabled } from "./lib/config";
import { dbState, isDbReady } from "./lib/db";
import { errorHandler, notFound } from "./lib/errors";
import { httpLogger } from "./lib/logger";
import { ok } from "./lib/respond";
import { apiLimiter } from "./middleware/rateLimit";
import { handleStripeWebhook } from "./modules/payments/controller";
import paymentRoutes from "./modules/payments/routes";
import userRoutes from "./modules/users/routes";
import { parseTrustProxyHops } from "./utils/trustProxy";
import chatRoutes from "./modules/chat/routes";
import documentRoutes from "./modules/documents/routes";
import portfolioRoutes from "./modules/portfolios/routes";
import resumeRoutes from "./modules/resumes/routes";
import uploadRoutes from "./modules/uploads/routes";
import applicationRoutes from "./modules/applications/routes";
import atsRoutes from "./modules/ats/routes";
import dashboardRoutes from "./modules/dashboard/routes";
import jobRoutes from "./modules/jobs/routes";

/**
 * Vercel preview deployments, e.g.
 * https://west-force-portfolio-bddo3np4u-maven19.vercel.app,
 * without allowing arbitrary websites.
 */
const VERCEL_PREVIEW_PATTERN =
  /^https:\/\/west-force-portfolio-[a-z0-9-]+\.vercel\.app$/i;

/** CLIENT_URL can hold one or more comma-separated origins. */
export function configuredOrigins(clientUrl: string = config.CLIENT_URL): string[] {
  return clientUrl
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsOptions(): CorsOptions {
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    ...configuredOrigins(),
  ]);

  return {
    origin(origin, callback) {
      // No Origin header: curl / server-to-server.
      if (!origin || allowedOrigins.has(origin) || VERCEL_PREVIEW_PATTERN.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}

export function createApp(): Express {
  const app = express();

  // Browsers reach the app through Vercel (rewrite) and then Render's proxy,
  // so trust 2 hops by default (TRUST_PROXY_HOPS). req.ip is then the browser
  // IP that Vercel added, and client-supplied X-Forwarded-For values before
  // it are ignored. Calls straight to the onrender.com URL skip Vercel and can
  // still fake req.ip, so never rely on IP alone for per-portfolio limits.
  app.set("trust proxy", parseTrustProxyHops(process.env.TRUST_PROXY_HOPS));

  // Request id (X-Request-Id in, echoed out) + one log line per request.
  app.use(httpLogger);

  // Set LOG_CLIENT_IP=true to log the proxy chain and confirm the hop count.
  app.use((req, _res, next) => {
    if (logClientIpEnabled()) {
      req.log.info(
        `[client-ip] ${req.method} ${req.path} ip=${req.ip} ips=${JSON.stringify(req.ips)}`
      );
    }
    next();
  });

  // CSP is off: this is a JSON/file API, and the frontend shows files from it
  // (e.g. the resume PDF in an iframe). CORP is cross-origin so the frontend
  // on another origin can still load files from the API.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(cors(corsOptions()));

  // Stripe signs the raw body: this must stay before express.json() and the limiter.
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  app.use("/api", apiLimiter);

  app.use(express.json({ limit: "1mb" }));

  app.get("/", (_req, res) => {
    res.json({ message: "WestForce API is running.", port: config.PORT });
  });

  // Liveness: always 200 while the process runs.
  app.get("/api/health", (_req, res) => {
    ok(res, {
      status: "OK",
      message: "WestForce backend is healthy.",
      db: dbState(),
    });
  });

  // Readiness: 503 until MongoDB is connected.
  app.get("/api/health/ready", (_req, res) => {
    const db = dbState();

    if (!isDbReady()) {
      res.status(503).json({ success: false, status: "UNAVAILABLE", db });
      return;
    }

    ok(res, { status: "OK", db });
  });

  app.get("/api/chat/health", (_req, res) => {
    res.json({
      status: "OK",
      configured: Boolean(process.env.GEMINI_API_KEY),
      model: config.GEMINI_CHAT_MODEL,
    });
  });

  app.use("/api/users", userRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/portfolios", portfolioRoutes);
  app.use("/api/portfolios", documentRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/resumes", resumeRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/applications", applicationRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/ats", atsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
