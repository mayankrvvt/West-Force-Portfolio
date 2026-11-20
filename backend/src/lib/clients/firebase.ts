import fs from "node:fs";
import https from "node:https";
import { cert, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { config, SERVICE_ACCOUNT_PATH } from "../config";

function loadServiceAccount(): ServiceAccount {
  if (config.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(config.FIREBASE_SERVICE_ACCOUNT_JSON) as ServiceAccount;
    } catch (error) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT_JSON must contain valid service account JSON.",
        { cause: error }
      );
    }
  }

  if (
    config.FIREBASE_PROJECT_ID &&
    config.FIREBASE_CLIENT_EMAIL &&
    config.FIREBASE_PRIVATE_KEY
  ) {
    // cert() accepts the snake_case keys of a downloaded key file.
    return {
      project_id: config.FIREBASE_PROJECT_ID,
      client_email: config.FIREBASE_CLIENT_EMAIL,
      private_key: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    } as ServiceAccount;
  }

  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    return JSON.parse(
      fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8")
    ) as ServiceAccount;
  }

  throw new Error(
    "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, " +
      "set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, " +
      `or provide ${SERVICE_ACCOUNT_PATH}.`
  );
}

// firebase-admin has no global request timeout; a socket timeout on the
// shared agent stops idle or stuck sockets (token/cert fetches) hanging forever.
const httpAgent = new https.Agent({ keepAlive: true, timeout: 10_000 });

export const firebaseApp = initializeApp({
  credential: cert(loadServiceAccount(), httpAgent),
  httpAgent,
});

export const auth = getAuth(firebaseApp);
