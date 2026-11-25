const admin = require("firebase-admin");

// Initialise Firebase Admin from the FIREBASE_SERVICE_ACCOUNT environment
// variable (the full service-account JSON, as one string), or from
// GOOGLE_APPLICATION_CREDENTIALS when running locally with a key file.
// If neither is present, the Admin SDK stays uninitialised and the API
// answers with a clear 503 instead of crashing — see routes/members.js.
let adminReady = false;

function initFirebaseAdmin() {
  if (admin.apps.length) {
    adminReady = true;
    return true;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminReady = true;
      return true;
    }

    // Fallback: application-default credentials (local gcloud / key file).
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      admin.initializeApp();
      adminReady = true;
      return true;
    }

    console.error(
      "GymNexus backend: Firebase Admin is not configured. " +
        "Set FIREBASE_SERVICE_ACCOUNT (service-account JSON) in the environment."
    );
    return false;
  } catch (error) {
    console.error("GymNexus backend: Firebase Admin failed to initialise:", error);
    return false;
  }
}

initFirebaseAdmin();

const db = adminReady ? admin.firestore() : null;

module.exports = { admin, db, adminReady };
