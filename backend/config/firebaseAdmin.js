const fs = require("node:fs");
const path = require("node:path");
const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const serviceAccountPath = path.resolve(
  __dirname,
  "../serviceAccountKey.json"
);
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service account JSON.",
      { cause: error }
    );
  }
} else if (
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
) {
  serviceAccount = {
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
} else if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = require(serviceAccountPath);
} else {
  throw new Error(
    "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, " +
      "set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, " +
      `or provide ${serviceAccountPath}.`
  );
}

const app = initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth(app);

module.exports = {
  app,
  auth,
};