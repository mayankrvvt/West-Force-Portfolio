const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

require("./config/firebaseAdmin");

const userRoutes = require("./routes/userRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const resumeRoutes = require("./routes/resumeRoutes");

const app = express();

// -------------------------
// CORS
// -------------------------

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
    credentials: true,
  })
);

// -------------------------
// Body Parser
// -------------------------

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

// -------------------------
// Health Check
// -------------------------

app.get("/", (req, res) => {
  res.json({
    message: "WestForce API is running.",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "WestForce backend is healthy.",
  });
});

// -------------------------
// API Routes
// -------------------------

app.use("/api/users", userRoutes);

app.use("/api/portfolios", portfolioRoutes);

app.use("/api/uploads", uploadRoutes);

app.use("/api/resumes", resumeRoutes);

// -------------------------
// 404 Handler
// -------------------------

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// -------------------------
// Error Handler
// -------------------------

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  res.status(500).json({
    message: "Internal server error.",
  });
});

// -------------------------
// Start Server
// -------------------------

const PORT = process.env.PORT || 5050;

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `WestForce API running on http://localhost:${PORT}`
      );

      console.log(
        `Gemini Resume API available at http://localhost:${PORT}/api/resumes`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error.message
    );

    process.exit(1);
  }
}

startServer();