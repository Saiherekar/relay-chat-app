import admin from "firebase-admin";
import { logger } from "../utils/logger";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (projectId && clientEmail && privateKey && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
} else {
  logger.warn(
    "Firebase credentials absent; Firestore message operations will return 503 until configured.",
  );
}

export const firestore = admin.apps.length ? admin.firestore() : null;
export const firebaseAdmin = admin;
