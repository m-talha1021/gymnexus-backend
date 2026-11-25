const express = require("express");
const {
  requireDb,
  listOwnerDocs,
  getOwnerDoc,
} = require("../utils/firestore");

const router = express.Router();
const COLLECTION = "payments";

// Mirrors the frontend's Dashboard reads (src/components/DashboardComponents.jsx):
// payments are recorded elsewhere and only read here — there is no create
// endpoint yet, matching the frontend which has no payment form.

// GET /api/payments — list the owner's payments (newest first)
router.get("/", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    return res.json(await listOwnerDocs(COLLECTION, req.user.uid));
  } catch (error) {
    console.error("List payments failed:", error);
    return res.status(500).json({ error: "Could not list payments." });
  }
});

// GET /api/payments/:id — one payment
router.get("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status, data } = await getOwnerDoc(
      COLLECTION,
      req.params.id,
      req.user.uid
    );
    if (status === 404) return res.status(404).json({ error: "Payment not found." });
    if (status === 403) return res.status(403).json({ error: "Not your payment." });
    return res.json(data);
  } catch (error) {
    console.error("Get payment failed:", error);
    return res.status(500).json({ error: "Could not load payment." });
  }
});

module.exports = router;
