const { db, adminReady } = require("../firebase");

// Shared helpers so every route talks to Firestore the same way the
// frontend does (same collections, same fields, owner-scoped reads).

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
  const data = { id: doc.id, ...doc.data() };
  // Firestore Timestamps do not JSON-serialise; convert them to ISO strings.
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value.toDate === "function") {
      data[key] = value.toDate().toISOString();
    }
  }
  return data;
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Same member-status rules as the frontend (DashboardComponents).
function getMemberStatus(member) {
  const expiry = asDate(member.membershipExpiryDate || member.expiryDate);
  const savedStatus = String(
    member.membershipStatus || member.status || ""
  ).toLowerCase();

  if (savedStatus === "suspended") return "Suspended";
  if (savedStatus === "expired") return "Expired";
  if (expiry && expiry < new Date()) return "Expired";
  if (savedStatus === "active" || (expiry && expiry >= new Date())) {
    return "Active";
  }
  return "Not set";
}

// List the signed-in owner's documents from a collection, newest first.
// Sorting happens in memory (no composite Firestore index needed).
async function listOwnerDocs(collection, ownerId) {
  const snapshot = await db
    .collection(collection)
    .where("ownerId", "==", ownerId)
    .get();
  const docs = snapshot.docs.map(serialise);
  docs.sort((a, b) => {
    const aTime = asDate(a.createdAt)?.getTime() || 0;
    const bTime = asDate(b.createdAt)?.getTime() || 0;
    return bTime - aTime;
  });
  return docs;
}

async function getOwnerDoc(collection, id, ownerId) {
  const doc = await db.collection(collection).doc(id).get();
  if (!doc.exists) return { status: 404 };
  const data = serialise(doc);
  if (data.ownerId && data.ownerId !== ownerId) return { status: 403 };
  return { status: 200, data };
}

module.exports = {
  requireDb,
  serialise,
  asDate,
  getMemberStatus,
  listOwnerDocs,
  getOwnerDoc,
};
