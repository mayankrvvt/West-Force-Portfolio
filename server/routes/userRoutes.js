const express = require("express");
const User = require("../models/User");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

/*
  GET /api/users/me

  Returns the currently authenticated user.
*/
router.get("/me", authenticateUser, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);

    return res.status(500).json({
      message: "Failed to get user.",
    });
  }
});


/*
  POST /api/users

  Creates a MongoDB user after Firebase authentication.
*/
router.post("/", authenticateUser, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    const email =
      req.body.email ||
      req.user.email ||
      "";

    const displayName =
      req.body.displayName ||
      req.user.name ||
      "";

    const photoURL =
      req.body.photoURL ||
      req.user.picture ||
      "";

    let user = await User.findOne({ firebaseUid });

    if (user) {
      return res.status(200).json({
        message: "User already exists.",
        user,
      });
    }

    user = await User.create({
      firebaseUid,
      email,
      displayName,
      photoURL,
    });

    return res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (error) {
    console.error("Create user error:", error);

    return res.status(500).json({
      message: "Failed to create user.",
    });
  }
});


/*
  PUT /api/users/me

  Updates basic user information.
*/
router.put("/me", authenticateUser, async (req, res) => {
  try {
    const firebaseUid = req.user.uid;

    const updates = {};

    if (req.body.displayName !== undefined) {
      updates.displayName = req.body.displayName;
    }

    if (req.body.photoURL !== undefined) {
      updates.photoURL = req.body.photoURL;
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $set: updates },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    return res.status(200).json({
      message: "User updated successfully.",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(500).json({
      message: "Failed to update user.",
    });
  }
});


module.exports = router;