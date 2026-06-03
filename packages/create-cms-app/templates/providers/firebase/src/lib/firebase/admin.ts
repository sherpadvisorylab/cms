import { getApps, initializeApp, cert, applicationDefault } from "firebase-admin/app";

/**
 * Initialise the Firebase Admin SDK once (singleton).
 *
 * - Local development uses explicit service account credentials from env vars.
 * - Cloud Run / App Hosting uses Application Default Credentials, so no
 *   private key is required when the runtime service account has access.
 */
export function initAdmin() {
  if (getApps().length > 0) return;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}
