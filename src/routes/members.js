const express = require("express");
const { db, adminReady } = require("../firebase");

const router = express.Router();
const COLLECTION = "members";

function requireDb(res) {
  if (!adminReady || !db) {
    res.status(503).json({
      error:
        "Backend is not connected to Firebase yet. Set FIREBASE_SERVICE_ACCOUNT in the environment.",
    });
    return false;
  }
  return true;
}

function serialise(doc) {
  return { id: doc.id, ...doc.data() };
}

// GET /api/members — list all members (newest first)
router.get("/", async (_req, res) => {
  if (!requireDb(res)) return;
  try {
    const snapshot = await db.collection(COLLECTION).orderBy("createdAt", "desc").get();
    return res.json(snapshot.docs.map(serialise));
  } catch (error) {
    console.error("List members failed:", error);
    return res.status(500).json({ error: "Could not list members." });
  }
});

// GET /api/members/:id — one member
router.get("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const doc = await db.collection(COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Member not found." });
    return res.json(serialise(doc));
  } catch (error) {
    console.error("Get member failed:", error);
    return res.status(500).json({ error: "Could not load member." });
  }
});

// POST /api/members — create a member
router.post("/", async (req, res) => {
  if (!requireDb(res)) return;
  const { fullName, email, phone } = req.body || {};
  if (!fullName || !email) {
    return res.status(400).json({ error: "fullName and email are required." });
  }
  try {
    const ref = await db.collection(COLLECTION).add({
      fullName,
      email,
      phone: phone || "",
      createdAt: new Date().toISOString(),
      createdBy: req.user ? req.user.uid : null,
    });
    const doc = await ref.get();
    return res.status(201).json(serialise(doc));
  } catch (error) {
    console.error("Create member failed:", error);
    return res.status(500).json({ error: "Could not create member." });
  }
});

// PUT /api/members/:id — update a member
router.put("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  const { fullName, email, phone } = req.body || {};
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Member not found." });
    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    await ref.update(updates);
    const updated = await ref.get();
    return res.json(serialise(updated));
  } catch (error) {
    console.error("Update member failed:", error);
    return res.status(500).json({ error: "Could not update member." });
  }
});

// DELETE /api/members/:id — delete a member
router.delete("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const ref = db.collection(COLLECTION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Member not found." });
    await ref.delete();
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    console.error("Delete member failed:", error);
    return res.status(500).json({ error: "Could not delete member." });
  }
});

module.exports = router;
