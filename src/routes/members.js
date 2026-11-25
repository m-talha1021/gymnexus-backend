const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { db } = require("../firebase");
const {
  requireDb,
  serialise,
  listOwnerDocs,
  getOwnerDoc,
} = require("../utils/firestore");

const router = express.Router();
const COLLECTION = "members";

// Mirrors the frontend's Members page (src/pages/Members/Members.jsx).
// Every document is scoped to the signed-in owner via ownerId.

// GET /api/members — list the owner's members (newest first)
router.get("/", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    return res.json(await listOwnerDocs(COLLECTION, req.user.uid));
  } catch (error) {
    console.error("List members failed:", error);
    return res.status(500).json({ error: "Could not list members." });
  }
});

// GET /api/members/:id — one member
router.get("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status, data } = await getOwnerDoc(
      COLLECTION,
      req.params.id,
      req.user.uid
    );
    if (status === 404) return res.status(404).json({ error: "Member not found." });
    if (status === 403) return res.status(403).json({ error: "Not your member." });
    return res.json(data);
  } catch (error) {
    console.error("Get member failed:", error);
    return res.status(500).json({ error: "Could not load member." });
  }
});

// POST /api/members — create a member
router.post("/", async (req, res) => {
  if (!requireDb(res)) return;
  const { fullName, email, phone, role } = req.body || {};
  if (!fullName?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "fullName and email are required." });
  }
  try {
    const ref = await db.collection(COLLECTION).add({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      role: role || "member",
      ownerId: req.user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
  try {
    const { status } = await getOwnerDoc(COLLECTION, req.params.id, req.user.uid);
    if (status === 404) return res.status(404).json({ error: "Member not found." });
    if (status === 403) return res.status(403).json({ error: "Not your member." });

    const { fullName, email, phone, role } = req.body || {};
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (fullName !== undefined) updates.fullName = fullName.trim();
    if (email !== undefined) updates.email = email.trim();
    if (phone !== undefined) updates.phone = (phone || "").trim();
    if (role !== undefined) updates.role = role;

    const ref = db.collection(COLLECTION).doc(req.params.id);
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
    const { status } = await getOwnerDoc(COLLECTION, req.params.id, req.user.uid);
    if (status === 404) return res.status(404).json({ error: "Member not found." });
    if (status === 403) return res.status(403).json({ error: "Not your member." });
    await db.collection(COLLECTION).doc(req.params.id).delete();
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    console.error("Delete member failed:", error);
    return res.status(500).json({ error: "Could not delete member." });
  }
});

module.exports = router;
