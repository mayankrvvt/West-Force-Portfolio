const express = require("express");
const crypto = require("crypto");

const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const authenticateUser = require("../middleware/authMiddleware");
const cloudinary = require("../config/cloudinary");

const router = express.Router();

const DOCUMENT_COOKIE_PREFIX =
  "westforce_document_access_";

const ACCESS_DURATION_MS =
  15 * 60 * 1000;

const MAX_PIN_ATTEMPTS = 5;

const pinAttempts = new Map();

/* =========================================================
   HELPERS
========================================================= */

function getDocumentAccessSecret() {
  const secret =
    process.env.DOCUMENT_ACCESS_SECRET;

  if (!secret) {
    throw new Error(
      "DOCUMENT_ACCESS_SECRET is not configured."
    );
  }

  return secret;
}

function hashPin(pin) {
  return crypto
    .createHash("sha256")
    .update(
      `${getDocumentAccessSecret()}:${pin}`
    )
    .digest("hex");
}

function createAccessToken(slug) {
  const expiresAt =
    Date.now() + ACCESS_DURATION_MS;

  const payload = `${slug}:${expiresAt}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        getDocumentAccessSecret()
      )
      .update(payload)
      .digest("hex");

  return `${expiresAt}.${signature}`;
}

function verifyAccessToken(slug, token) {
  if (!token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const expiresAt = Number(parts[0]);
  const signature = parts[1];

  if (
    !Number.isFinite(expiresAt) ||
    expiresAt < Date.now()
  ) {
    return false;
  }

  const payload =
    `${slug}:${expiresAt}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        getDocumentAccessSecret()
      )
      .update(payload)
      .digest("hex");

  if (
    signature.length !==
    expectedSignature.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

function getCookie(req, name) {
  const header =
    req.headers.cookie;

  if (!header) {
    return null;
  }

  const cookies = header
    .split(";")
    .map((part) => part.trim());

  const target =
    cookies.find((cookie) =>
      cookie.startsWith(`${name}=`)
    );

  if (!target) {
    return null;
  }

  return decodeURIComponent(
    target.substring(name.length + 1)
  );
}

function getAttemptKey(req, slug) {
  const forwarded =
    req.headers["x-forwarded-for"];

  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  return `${ip}:${slug}`;
}

function cleanPublicDocument(document) {
  return {
    _id: document._id,

    name: document.name || "",

    type:
      document.type ||
      document.format ||
      "Document",

    size:
      document.size || 0,

    protected:
      document.protected !== false,

    /*
     * NEVER return:
     *
     * fileUrl
     * publicId
     *
     * for protected documents.
     */
  };
}

/* =========================================================
   GET MY PORTFOLIO
========================================================= */

router.get(
  "/me",
  authenticateUser,
  async (req, res) => {
    try {
      const user =
        await User.findOne({
          firebaseUid:
            req.user.uid,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const portfolio =
        await Portfolio.findOne({
          userId: user._id,
        }).select("+documentProtection.pinHash");

      if (!portfolio) {
        return res.status(404).json({
          message: "Portfolio not found.",
        });
      }

      return res.status(200).json({
        portfolio,
      });
    } catch (error) {
      console.error(
        "GET /api/portfolios/me error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load portfolio.",
      });
    }
  }
);

/* =========================================================
   CREATE PORTFOLIO
========================================================= */

router.post(
  "/",
  authenticateUser,
  async (req, res) => {
    try {
      const user =
        await User.findOne({
          firebaseUid:
            req.user.uid,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const existing =
        await Portfolio.findOne({
          userId: user._id,
        });

      if (existing) {
        return res.status(409).json({
          message:
            "You already have a portfolio.",
        });
      }

      const body = {
        ...req.body,

        userId: user._id,

        slug: String(
          req.body.slug || ""
        )
          .trim()
          .toLowerCase(),

        status:
          req.body.status === "published"
            ? "published"
            : "draft",
      };

      if (
        body.documentProtection
          ?.enabled
      ) {
        const pin =
          String(
            body.documentProtection.pin ||
              ""
          );

        if (!/^\d{4}$/.test(pin)) {
          return res.status(400).json({
            message:
              "Document PIN must contain exactly 4 digits.",
          });
        }

        body.documentProtection = {
          enabled: true,
          pinHash: hashPin(pin),
        };
      } else {
        body.documentProtection = {
          enabled: false,
          pinHash: "",
        };
      }

      if (body.status === "published") {
        body.publishedAt =
          new Date();
      }

      const portfolio =
        await Portfolio.create(body);

      const safePortfolio =
        portfolio.toObject();

      if (
        safePortfolio.documentProtection
      ) {
        delete safePortfolio
          .documentProtection
          .pinHash;
      }

      return res.status(201).json({
        message:
          "Portfolio created successfully.",

        portfolio:
          safePortfolio,
      });
    } catch (error) {
      console.error(
        "POST /api/portfolios error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          message:
            "That portfolio URL is already in use.",
        });
      }

      return res.status(500).json({
        message:
          "Failed to create portfolio.",
      });
    }
  }
);

/* =========================================================
   UPDATE MY PORTFOLIO
========================================================= */

router.put(
  "/me",
  authenticateUser,
  async (req, res) => {
    try {
      const user =
        await User.findOne({
          firebaseUid:
            req.user.uid,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const portfolio =
        await Portfolio.findOne({
          userId: user._id,
        }).select("+documentProtection.pinHash");

      if (!portfolio) {
        return res.status(404).json({
          message:
            "Portfolio not found.",
        });
      }

      const allowedFields = [
        "slug",
        "status",
        "template",
        "profile",
        "hero",
        "about",
        "experience",
        "education",
        "skills",
        "documents",
        "resume",
        "socialLinks",
      ];

      for (const field of allowedFields) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          portfolio[field] =
            req.body[field];
        }
      }

      /* -----------------------------------------------
         DOCUMENT PROTECTION
      ------------------------------------------------ */

      if (
        req.body.documentProtection
      ) {
        const protection =
          req.body.documentProtection;

        if (
          protection.enabled
        ) {
          const pin =
            String(
              protection.pin || ""
            );

          /*
           * If the frontend doesn't send a new PIN,
           * keep the existing PIN.
           */
          if (pin) {
            if (
              !/^\d{4}$/.test(pin)
            ) {
              return res.status(400).json({
                message:
                  "Document PIN must contain exactly 4 digits.",
              });
            }

            portfolio.documentProtection = {
              enabled: true,
              pinHash:
                hashPin(pin),
            };
          } else {
            portfolio.documentProtection.enabled =
              true;
          }
        } else {
          portfolio.documentProtection = {
            enabled: false,
            pinHash: "",
          };
        }
      }

      if (
        portfolio.status ===
        "published"
      ) {
        portfolio.publishedAt =
          portfolio.publishedAt ||
          new Date();
      } else {
        portfolio.publishedAt =
          null;
      }

      await portfolio.save();

      const result =
        portfolio.toObject();

      if (
        result.documentProtection
      ) {
        delete result
          .documentProtection
          .pinHash;
      }

      return res.status(200).json({
        message:
          "Portfolio updated successfully.",

        portfolio: result,
      });
    } catch (error) {
      console.error(
        "PUT /api/portfolios/me error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          message:
            "That portfolio URL is already in use.",
        });
      }

      return res.status(500).json({
        message:
          "Failed to update portfolio.",
      });
    }
  }
);

/* =========================================================
   DOCUMENT PIN SETTINGS
========================================================= */

router.put(
  "/me/document-protection",
  authenticateUser,
  async (req, res) => {
    try {
      const user =
        await User.findOne({
          firebaseUid:
            req.user.uid,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const portfolio =
        await Portfolio.findOne({
          userId: user._id,
        }).select("+documentProtection.pinHash");

      if (!portfolio) {
        return res.status(404).json({
          message:
            "Portfolio not found.",
        });
      }

      const enabled =
        Boolean(req.body.enabled);

      if (!enabled) {
        portfolio.documentProtection = {
          enabled: false,
          pinHash: "",
        };

        await portfolio.save();

        return res.status(200).json({
          message:
            "Document protection disabled.",

          documentProtection: {
            enabled: false,
          },
        });
      }

      const pin =
        String(
          req.body.pin || ""
        );

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          message:
            "PIN must contain exactly 4 digits.",
        });
      }

      portfolio.documentProtection = {
        enabled: true,
        pinHash: hashPin(pin),
      };

      await portfolio.save();

      return res.status(200).json({
        message:
          "Document protection enabled.",

        documentProtection: {
          enabled: true,
        },
      });
    } catch (error) {
      console.error(
        "Document protection error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update document protection.",
      });
    }
  }
);

/* =========================================================
   PUBLIC PORTFOLIO
========================================================= */

router.get(
  "/:slug",
  async (req, res) => {
    try {
      const slug =
        String(
          req.params.slug || ""
        )
          .trim()
          .toLowerCase();

      const portfolio =
        await Portfolio.findOne({
          slug,
          status: "published",
        }).select(
          "-documentProtection.pinHash"
        );

      if (!portfolio) {
        return res.status(404).json({
          message:
            "Published portfolio not found.",
        });
      }

      const result =
        portfolio.toObject();

      /*
       * Documents remain visible,
       * but their actual file access
       * information is removed.
       */
      result.documents =
        Array.isArray(
          result.documents
        )
          ? result.documents.map(
              cleanPublicDocument
            )
          : [];

      /*
       * Resume is intentionally NOT modified.
       */
      return res.status(200).json({
        portfolio: result,
      });
    } catch (error) {
      console.error(
        "Public portfolio error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to load public portfolio.",
      });
    }
  }
);

/* =========================================================
   UNLOCK DOCUMENTS
========================================================= */

router.post(
  "/:slug/unlock-documents",
  async (req, res) => {
    try {
      const slug =
        String(
          req.params.slug || ""
        )
          .trim()
          .toLowerCase();

      const pin =
        String(
          req.body.pin || ""
        );

      if (!/^\d{4}$/.test(pin)) {
        return res.status(400).json({
          message:
            "Enter a valid 4-digit PIN.",
        });
      }

      const portfolio =
        await Portfolio.findOne({
          slug,
          status: "published",
        }).select(
          "+documentProtection.pinHash"
        );

      if (!portfolio) {
        return res.status(404).json({
          message:
            "Published portfolio not found.",
        });
      }

      /*
       * If protection is disabled,
       * there is nothing to unlock.
       */
      if (
        !portfolio.documentProtection
          ?.enabled
      ) {
        return res.status(200).json({
          message:
            "Document protection is not enabled.",
          unlocked: true,
        });
      }

      const attemptKey =
        getAttemptKey(
          req,
          slug
        );

      const now = Date.now();

      const existing =
        pinAttempts.get(
          attemptKey
        );

      if (
        existing &&
        existing.resetAt > now &&
        existing.count >=
          MAX_PIN_ATTEMPTS
      ) {
        const retryAfter =
          Math.ceil(
            (existing.resetAt -
              now) /
              1000
          );

        return res.status(429).json({
          message:
            `Too many incorrect PIN attempts. Try again in ${retryAfter} seconds.`,
          retryAfter,
        });
      }

      const expectedHash =
        portfolio.documentProtection
          .pinHash;

      const suppliedHash =
        hashPin(pin);

      const correct =
        Boolean(expectedHash) &&
        crypto.timingSafeEqual(
          Buffer.from(
            suppliedHash
          ),
          Buffer.from(
            expectedHash
          )
        );

      if (!correct) {
        const current =
          pinAttempts.get(
            attemptKey
          );

        const count =
          current &&
          current.resetAt > now
            ? current.count + 1
            : 1;

        pinAttempts.set(
          attemptKey,
          {
            count,
            resetAt:
              now + 15 * 60 * 1000,
          }
        );

        return res.status(401).json({
          message:
            "Incorrect PIN.",
          attemptsRemaining:
            Math.max(
              0,
              MAX_PIN_ATTEMPTS -
                count
            ),
        });
      }

      /*
       * Correct PIN.
       */
      pinAttempts.delete(
        attemptKey
      );

      const token =
        createAccessToken(slug);

      const cookieName =
        `${DOCUMENT_COOKIE_PREFIX}${slug}`;

      res.cookie(
        cookieName,
        token,
        {
          httpOnly: true,
          sameSite: "lax",
          secure:
            process.env.NODE_ENV ===
            "production",
          maxAge:
            ACCESS_DURATION_MS,
          path: `/api/portfolios/${slug}`,
        }
      );

      return res.status(200).json({
        message:
          "Documents unlocked.",

        unlocked: true,

        expiresIn:
          ACCESS_DURATION_MS,
      });
    } catch (error) {
      console.error(
        "Unlock documents error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to unlock documents.",
      });
    }
  }
);

/* =========================================================
   PROTECTED DOCUMENT
========================================================= */

router.get(
  "/:slug/documents/:documentId",
  async (req, res) => {
    try {
      const slug =
        String(
          req.params.slug || ""
        )
          .trim()
          .toLowerCase();

      const documentId =
        req.params.documentId;

      const portfolio =
        await Portfolio.findOne({
          slug,
          status: "published",
        }).select(
          "+documentProtection.pinHash"
        );

      if (!portfolio) {
        return res.status(404).json({
          message:
            "Published portfolio not found.",
        });
      }

      const document =
        portfolio.documents.id(
          documentId
        );

      if (!document) {
        return res.status(404).json({
          message:
            "Document not found.",
        });
      }

      /*
       * If protection is enabled,
       * verify the temporary cookie.
       */
      if (
        portfolio.documentProtection
          ?.enabled
      ) {
        const cookieName =
          `${DOCUMENT_COOKIE_PREFIX}${slug}`;

        const token =
          getCookie(
            req,
            cookieName
          );

        const valid =
          verifyAccessToken(
            slug,
            token
          );

        if (!valid) {
          return res.status(403).json({
            message:
              "Document access requires the portfolio PIN.",
          });
        }
      }

      /*
       * For newly uploaded protected
       * documents we need publicId.
       */
      if (!document.publicId) {
        /*
         * Backwards compatibility for
         * old documents.
         *
         * These were uploaded as public
         * Cloudinary resources.
         */
        if (document.fileUrl) {
          return res.redirect(
            document.fileUrl
          );
        }

        return res.status(404).json({
          message:
            "Document file is unavailable.",
        });
      }

      /*
       * Generate a short-lived signed
       * authenticated Cloudinary URL.
       */
      const signedUrl =
        cloudinary.url(
          document.publicId,
          {
            resource_type:
              document.resourceType ||
              "raw",

            type: "authenticated",

            secure: true,

            sign_url: true,

            expires_at:
              Math.floor(
                (Date.now() +
                  2 * 60 * 1000) /
                  1000
              ),
          }
        );

      return res.redirect(
        signedUrl
      );
    } catch (error) {
      console.error(
        "Protected document error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to access document.",
      });
    }
  }
);

/* =========================================================
   DELETE MY PORTFOLIO
========================================================= */

router.delete(
  "/me",
  authenticateUser,
  async (req, res) => {
    try {
      const user =
        await User.findOne({
          firebaseUid:
            req.user.uid,
        });

      if (!user) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      const deleted =
        await Portfolio.findOneAndDelete({
          userId: user._id,
        });

      if (!deleted) {
        return res.status(404).json({
          message:
            "Portfolio not found.",
        });
      }

      return res.status(200).json({
        message:
          "Portfolio deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE /api/portfolios/me error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete portfolio.",
      });
    }
  }
);

module.exports = router;