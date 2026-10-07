const express = require("express");
const cors = require("cors");
const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const connectDB = require("./config/db");

require("./config/firebaseAdmin");

const userRoutes = require("./routes/userRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const chatRoutes = require("./routes/chatRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const PORT = Number(process.env.PORT || 5050);

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| Allowed frontend origins
|--------------------------------------------------------------------------
|
| CLIENT_URL can contain one or multiple comma-separated URLs.
|
| Example:
|
| CLIENT_URL=https://west-force-portfolio.vercel.app,http://localhost:5173
|
*/

const configuredOrigins = CLIENT_URL
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/*
|--------------------------------------------------------------------------
| Vercel preview URL support
|--------------------------------------------------------------------------
|
| This allows Vercel preview deployments such as:
|
| https://west-force-portfolio-bddo3np4u-maven19.vercel.app
|
| while NOT allowing arbitrary websites.
|
*/

const VERCEL_PREVIEW_PATTERN =
  /^https:\/\/west-force-portfolio-[a-z0-9-]+\.vercel\.app$/i;

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin
      // such as curl/server-to-server.
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.has(origin) ||
        VERCEL_PREVIEW_PATTERN.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "Not allowed by CORS"
        )
      );
    },

    credentials: true,
  })
);

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  paymentRoutes.handleStripeWebhook
);

/*
|--------------------------------------------------------------------------
| Body parser
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "1mb",
  })
);

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.json({
    message: "WestForce API is running.",
    port: PORT,
  });
});

app.get("/api/health", (req, res) => {
  return res.json({
    status: "OK",
    message: "WestForce backend is healthy.",
  });
});

/*
|--------------------------------------------------------------------------
| Gemini chatbot health
|--------------------------------------------------------------------------
*/

app.get("/api/chat/health", (req, res) => {
  return res.json({
    status: "OK",

    configured: Boolean(
      process.env.GEMINI_API_KEY
    ),

    model:
      process.env.GEMINI_CHAT_MODEL ||
      "gemini-3.6-flash",
  });
});

/*
|--------------------------------------------------------------------------
| API routes
|--------------------------------------------------------------------------
*/

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/payments",
  paymentRoutes
);

app.use(
  "/api/portfolios",
  portfolioRoutes
);

app.use(
  "/api/uploads",
  uploadRoutes
);

app.use(
  "/api/chat",
  chatRoutes
);

app.use(
  "/api/resumes",
  resumeRoutes
);

/*
|--------------------------------------------------------------------------
| 404 handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found.",
  });
});

/*
|--------------------------------------------------------------------------
| Error handler
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {
    console.error(
      "WestForce server error:",
      error
    );

    const status =
      Number.isInteger(error.status) &&
      error.status >= 400 &&
      error.status < 500
        ? error.status
        : 500;

    return res.status(status).json({
      success: false,
      message: status < 500
        ? error.message
        : "Internal server error.",
    });
  }
);

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `WestForce API running on http://localhost:${PORT}`
      );

      console.log(
        `Gemini Resume/Chat API available at http://localhost:${PORT}/api/chat`
      );

      console.log(
        `Gemini model: ${
          process.env.GEMINI_CHAT_MODEL ||
          "gemini-3.6-flash"
        }`
      );

      console.log(
        `Gemini configured: ${
          process.env.GEMINI_API_KEY
            ? "YES"
            : "NO"
        }`
      );

      console.log(
        "Allowed CORS origins:"
      );

      configuredOrigins.forEach(
        (origin) => {
          console.log(`  - ${origin}`);
        }
      );

      console.log(
        "Vercel preview deployments: ENABLED"
      );
    });
  } catch (error) {
    console.error(
      "Failed to start WestForce server:",
      error.message
    );

    process.exit(1);
  }
}

startServer();