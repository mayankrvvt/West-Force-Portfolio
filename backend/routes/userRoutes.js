const express = require("express");
const User = require("../models/User");
const authenticateUser = require("../middleware/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/users/me
|--------------------------------------------------------------------------
| Returns the currently authenticated user.
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
    console.error("========== GET USER ERROR ==========");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    console.error("====================================");

    return res.status(500).json({
      message: "Failed to get user.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

/*
|--------------------------------------------------------------------------
| POST /api/users
|--------------------------------------------------------------------------
| Creates a MongoDB user after Firebase authentication.
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

    console.log("");
    console.log("========== CREATE / FIND USER ==========");
    console.log("Firebase UID:", firebaseUid);
    console.log("Email:", email);
    console.log("Display Name:", displayName);
    console.log("Photo URL:", photoURL);
    console.log("========================================");

    /*
    |--------------------------------------------------------------------------
    | Validate required information
    |--------------------------------------------------------------------------
    */
    if (!firebaseUid) {
      console.error("Firebase UID is missing.");

      return res.status(400).json({
        message: "Firebase UID is missing.",
      });
    }

    if (!email) {
      console.error("User email is missing.");

      return res.status(400).json({
        message: "User email is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find existing MongoDB user
    |--------------------------------------------------------------------------
    */
    console.log("Checking MongoDB for existing user...");

    let user = await User.findOne({
      firebaseUid,
    });

    if (user) {
      console.log(
        "Existing MongoDB user found:",
        user._id.toString()
      );

      return res.status(200).json({
        message: "User already exists.",
        user,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create new MongoDB user
    |--------------------------------------------------------------------------
    */
    console.log("Creating new MongoDB user...");

    user = await User.create({
      firebaseUid,
      email,
      displayName,
      photoURL,
    });

    console.log(
      "MongoDB user created successfully:",
      user._id.toString()
    );

    return res.status(201).json({
      message: "User created successfully.",
      user,
    });
  } catch (error) {
    console.error("");
    console.error("==========================================");
    console.error("          CREATE USER ERROR");
    console.error("==========================================");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    console.error("==========================================");
    console.error("");

    return res.status(500).json({
      message: "Failed to create user.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

/*
|--------------------------------------------------------------------------
| PUT /api/users/me
|--------------------------------------------------------------------------
| Updates basic user information.
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
    console.error("========== UPDATE USER ERROR ==========");
    console.error("Name:", error.name);
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Stack:", error.stack);
    console.error("=======================================");

    return res.status(500).json({
      message: "Failed to update user.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Export router
|--------------------------------------------------------------------------
*/
module.exports = router;