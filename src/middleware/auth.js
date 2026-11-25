const { admin, adminReady } = require("../firebase");

// Require a Firebase ID token on protected routes.
// The frontend sends it as: Authorization: Bearer <idToken>
// (obtained from auth.currentUser.getIdToken()).
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing auth token." });
  }

  if (!adminReady) {
    return res
      .status(503)
      .json({ error: "Backend is not connected to Firebase yet." });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired auth token." });
  }
}

module.exports = { requireAuth };
