const Entitlement = require("../models/Entitlement");

async function findUserEntitlement(user) {
  const byUid = await Entitlement.findOne({
    firebaseUid: user.uid,
  });

  if (byUid) {
    return byUid;
  }

  if (!user.email || user.email_verified !== true) {
    return null;
  }

  return Entitlement.findOneAndUpdate(
    {
      email: user.email.trim().toLowerCase(),
      $or: [
        { firebaseUid: null },
        { firebaseUid: { $exists: false } },
        { firebaseUid: user.uid },
      ],
    },
    {
      $set: {
        firebaseUid: user.uid,
      },
    },
    {
      new: true,
    }
  );
}

async function requirePaidUser(req, res, next) {
  try {
    const entitlement = await findUserEntitlement(req.user);

    if (!entitlement) {
      return res.status(402).json({
        code: "PAYMENT_REQUIRED",
        message: "Choose a plan to unlock this feature.",
      });
    }

    req.entitlement = entitlement;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  findUserEntitlement,
  requirePaidUser,
};
