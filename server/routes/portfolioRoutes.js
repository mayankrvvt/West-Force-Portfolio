const express = require("express");
const mongoose = require("mongoose");

const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();


/*
  Helper function

  Finds the MongoDB User associated with
  the authenticated Firebase user.
*/
async function getMongoUser(firebaseUid) {
  return User.findOne({ firebaseUid });
}


/*
  GET /api/portfolios/me

  Get the authenticated user's portfolio.
*/
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const user = await getMongoUser(req.user.uid);

    if (!user) {
      return res.status(404).json({
        message: "MongoDB user not found.",
      });
    }

    const portfolio = await Portfolio.findOne({
      userId: user._id,
    });

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found.",
      });
    }

    return res.status(200).json({
      portfolio,
    });
  } catch (error) {
    console.error("Get portfolio error:", error);

    return res.status(500).json({
      message: "Failed to get portfolio.",
    });
  }
});


/*
  POST /api/portfolios

  Create a new portfolio.
*/
router.post("/", authenticateUser, async (req, res) => {
  try {
    const user = await getMongoUser(req.user.uid);

    if (!user) {
      return res.status(404).json({
        message:
          "MongoDB user not found. Create the user first.",
      });
    }

    const existingPortfolio = await Portfolio.findOne({
      userId: user._id,
    });

    if (existingPortfolio) {
      return res.status(409).json({
        message: "You already have a portfolio.",
        portfolio: existingPortfolio,
      });
    }

    const {
      slug,
      status,
      template,
      profile,
      hero,
      about,
      experience,
      education,
      skills,
      documents,
      resume,
      socialLinks,
    } = req.body;

    if (!slug) {
      return res.status(400).json({
        message: "Portfolio slug is required.",
      });
    }

    const existingSlug = await Portfolio.findOne({
      slug: slug.toLowerCase(),
    });

    if (existingSlug) {
      return res.status(409).json({
        message: "This portfolio slug is already in use.",
      });
    }

    const portfolio = await Portfolio.create({
      userId: user._id,
      slug: slug.toLowerCase(),
      status: status || "draft",
      template: template || "default",
      profile,
      hero,
      about,
      experience,
      education,
      skills,
      documents,
      resume,
      socialLinks,
    });

    return res.status(201).json({
      message: "Portfolio created successfully.",
      portfolio,
    });
  } catch (error) {
    console.error("Create portfolio error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A portfolio with this slug already exists.",
      });
    }

    return res.status(500).json({
      message: "Failed to create portfolio.",
    });
  }
});


/*
  PUT /api/portfolios/me

  Update the authenticated user's portfolio.
*/
router.put("/me", authenticateUser, async (req, res) => {
  try {
    const user = await getMongoUser(req.user.uid);

    if (!user) {
      return res.status(404).json({
        message: "MongoDB user not found.",
      });
    }

    const portfolio = await Portfolio.findOne({
      userId: user._id,
    });

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found.",
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
      if (req.body[field] !== undefined) {
        portfolio[field] = req.body[field];
      }
    }

    if (req.body.slug !== undefined) {
      portfolio.slug = req.body.slug.toLowerCase();
    }

    if (
      req.body.status === "published" &&
      portfolio.status !== "published"
    ) {
      portfolio.publishedAt = new Date();
    }

    if (req.body.status === "draft") {
      portfolio.publishedAt = null;
    }

    await portfolio.save();

    return res.status(200).json({
      message: "Portfolio updated successfully.",
      portfolio,
    });
  } catch (error) {
    console.error("Update portfolio error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This portfolio slug is already in use.",
      });
    }

    return res.status(500).json({
      message: "Failed to update portfolio.",
    });
  }
});


/*
  DELETE /api/portfolios/me

  Delete the authenticated user's portfolio.
*/
router.delete("/me", authenticateUser, async (req, res) => {
  try {
    const user = await getMongoUser(req.user.uid);

    if (!user) {
      return res.status(404).json({
        message: "MongoDB user not found.",
      });
    }

    const portfolio = await Portfolio.findOneAndDelete({
      userId: user._id,
    });

    if (!portfolio) {
      return res.status(404).json({
        message: "Portfolio not found.",
      });
    }

    return res.status(200).json({
      message: "Portfolio deleted successfully.",
    });
  } catch (error) {
    console.error("Delete portfolio error:", error);

    return res.status(500).json({
      message: "Failed to delete portfolio.",
    });
  }
});


/*
  GET /api/portfolios/:slug

  Public portfolio page.

  This does NOT require Firebase authentication.
*/
router.get("/:slug", async (req, res) => {
  try {
    const slug = req.params.slug.toLowerCase();

    const portfolio = await Portfolio.findOne({
      slug,
      status: "published",
    });

    if (!portfolio) {
      return res.status(404).json({
        message: "Published portfolio not found.",
      });
    }

    return res.status(200).json({
      portfolio,
    });
  } catch (error) {
    console.error("Get public portfolio error:", error);

    return res.status(500).json({
      message: "Failed to get portfolio.",
    });
  }
});


module.exports = router;