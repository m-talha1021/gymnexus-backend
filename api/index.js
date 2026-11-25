require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { adminReady } = require("../src/firebase");
const { requireAuth } = require("../src/middleware/auth");
const membersRouter = require("../src/routes/members");

const app = express();

app.use(cors());
app.use(express.json());

// Public health check — the frontend uses this to show its backend status.
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "gymnexus-backend",
    firebase: adminReady ? "connected" : "not-configured",
    time: new Date().toISOString(),
  });
});

// Members API — every route requires a signed-in gym owner.
app.use("/api/members", requireAuth, membersRouter);

// 404 for unknown API paths.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Unknown API route." });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Something went wrong." });
});

// Local development: `npm run dev` starts a normal server.
// On Vercel this file is imported as a serverless function instead.
if (require.main === module) {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`GymNexus backend listening on http://localhost:${port}`);
    console.log(`Firebase Admin: ${adminReady ? "connected" : "not configured"}`);
  });
}

module.exports = app;
