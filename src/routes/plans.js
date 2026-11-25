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
const COLLECTION = "membershipPlans";

// Mirrors the frontend's Memberships page
// (src/pages/Memberships/Memberships.jsx): plans have a name, a duration
// in months, a price, a description and an active/inactive status.

// GET /api/plans — list the owner's plans (newest first)
router.get("/", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    return res.json(await listOwnerDocs(COLLECTION, req.user.uid));
  } catch (error) {
    console.error("List plans failed:", error);
    return res.status(500).json({ error: "Could not list plans." });
  }
});

// GET /api/plans/:id — one plan
router.get("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status, data } = await getOwnerDoc(
      COLLECTION,
      req.params.id,
      req.user.uid
    );
    if (status === 404) return res.status(404).json({ error: "Plan not found." });
    if (status === 403) return res.status(403).json({ error: "Not your plan." });
    return res.json(data);
  } catch (error) {
    console.error("Get plan failed:", error);
    return res.status(500).json({ error: "Could not load plan." });
  }
});

// POST /api/plans — create a plan
router.post("/", async (req, res) => {
  if (!requireDb(res)) return;
  const { name, price, duration, description, status } = req.body || {};
  if (!name?.trim() || price === "" || price === undefined) {
    return res.status(400).json({ error: "Plan name and price are required." });
  }
  const parsedPrice = Number(price);
  const parsedDuration = Number(duration);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return res.status(400).json({ error: "Enter a valid plan price." });
  }
  if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
    return res.status(400).json({ error: "Enter a valid plan duration." });
  }
  try {
    const ref = await db.collection(COLLECTION).add({
      name: name.trim(),
      duration: parsedDuration,
      durationUnit: "months",
      price: parsedPrice,
      description: (description || "").trim(),
      status: status || "active",
      ownerId: req.user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const doc = await ref.get();
    return res.status(201).json(serialise(doc));
  } catch (error) {
    console.error("Create plan failed:", error);
    return res.status(500).json({ error: "Could not create plan." });
  }
});

// PUT /api/plans/:id — update a plan
router.put("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status } = await getOwnerDoc(COLLECTION, req.params.id, req.user.uid);
    if (status === 404) return res.status(404).json({ error: "Plan not found." });
    if (status === 403) return res.status(403).json({ error: "Not your plan." });

    const { name, price, duration, description, status: newStatus } = req.body || {};
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) updates.name = name.trim();
    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ error: "Enter a valid plan price." });
      }
      updates.price = parsedPrice;
    }
    if (duration !== undefined) {
      const parsedDuration = Number(duration);
      if (!Number.isInteger(parsedDuration) || parsedDuration < 1) {
        return res.status(400).json({ error: "Enter a valid plan duration." });
      }
      updates.duration = parsedDuration;
    }
    if (description !== undefined) updates.description = description.trim();
    if (newStatus !== undefined) updates.status = newStatus;

    const ref = db.collection(COLLECTION).doc(req.params.id);
    await ref.update(updates);
    const updated = await ref.get();
    return res.json(serialise(updated));
  } catch (error) {
    console.error("Update plan failed:", error);
    return res.status(500).json({ error: "Could not update plan." });
  }
});

// PATCH /api/plans/:id/status — flip a plan between active and inactive
router.patch("/:id/status", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status, data } = await getOwnerDoc(
      COLLECTION,
      req.params.id,
      req.user.uid
    );
    if (status === 404) return res.status(404).json({ error: "Plan not found." });
    if (status === 403) return res.status(403).json({ error: "Not your plan." });
    const newStatus = data.status === "active" ? "inactive" : "active";
    const ref = db.collection(COLLECTION).doc(req.params.id);
    await ref.update({
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    return res.json(serialise(updated));
  } catch (error) {
    console.error("Toggle plan status failed:", error);
    return res.status(500).json({ error: "Could not update plan status." });
  }
});

// DELETE /api/plans/:id — delete a plan
router.delete("/:id", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const { status } = await getOwnerDoc(COLLECTION, req.params.id, req.user.uid);
    if (status === 404) return res.status(404).json({ error: "Plan not found." });
    if (status === 403) return res.status(403).json({ error: "Not your plan." });
    await db.collection(COLLECTION).doc(req.params.id).delete();
    return res.json({ ok: true, id: req.params.id });
  } catch (error) {
    console.error("Delete plan failed:", error);
    return res.status(500).json({ error: "Could not delete plan." });
  }
});

module.exports = router;
