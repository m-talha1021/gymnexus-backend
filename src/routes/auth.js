const express = require("express");
const { db } = require("../firebase");
const { requireDb } = require("../utils/firestore");

const router = express.Router();

// GET /api/me — who the caller is, and whether they are a gym owner.
// Mirrors the frontend's App.jsx owner check: an `admins/{uid}` document
// with role "owner".
router.get("/me", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const doc = await db.collection("admins").doc(req.user.uid).get();
    const isOwner = doc.exists && doc.data().role === "owner";
    return res.json({
      uid: req.user.uid,
      email: req.user.email || null,
      isOwner,
    });
  } catch (error) {
    console.error("Load profile failed:", error);
    return res.status(500).json({ error: "Could not load profile." });
  }
});

module.exports = router;
