const express = require("express");
const { db } = require("../firebase");
const {
  requireDb,
  serialise,
  asDate,
  getMemberStatus,
} = require("../utils/firestore");

const router = express.Router();

// GET /api/dashboard/stats — the same numbers the frontend Dashboard
// computes from Firestore (src/components/DashboardComponents.jsx):
// total members, active members, this month's paid revenue, pending
// payments, the 5 newest members, and memberships expiring in 7 days.
router.get("/stats", async (req, res) => {
  if (!requireDb(res)) return;
  try {
    const ownerId = req.user.uid;

    const [membersSnap, paymentsSnap] = await Promise.all([
      db.collection("members").where("ownerId", "==", ownerId).get(),
      db.collection("payments").where("ownerId", "==", ownerId).get(),
    ]);

    const members = membersSnap.docs.map(serialise);
    const payments = paymentsSnap.docs.map(serialise);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const activeMembers = members.filter(
      (member) => getMemberStatus(member) === "Active"
    ).length;

    const paidStatuses = ["paid", "completed", "success", "successful"];
    const monthlyRevenue = payments.reduce((total, payment) => {
      const status = String(payment.status || payment.paymentStatus || "").toLowerCase();
      const paid = paidStatuses.includes(status);
      const date = asDate(payment.createdAt || payment.paymentDate);
      if (paid && date && date >= monthStart && date <= now) {
        return total + Number(payment.amount || payment.paidAmount || 0);
      }
      return total;
    }, 0);

    const pendingPayments = payments.reduce((total, payment) => {
      const status = String(payment.status || payment.paymentStatus || "").toLowerCase();
      if (["pending", "due", "unpaid", "partial"].includes(status)) {
        return (
          total +
          Number(
            payment.pendingAmount ?? payment.balance ?? payment.amount ?? 0
          )
        );
      }
      return total;
    }, 0);

    const recentMembers = [...members]
      .sort((a, b) => {
        const aTime = asDate(a.createdAt || a.joiningDate)?.getTime() || 0;
        const bTime = asDate(b.createdAt || b.joiningDate)?.getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const upcomingExpiries = members
      .map((member) => ({
        ...member,
        expiry: asDate(member.membershipExpiryDate || member.expiryDate),
      }))
      .filter((member) => {
        if (!member.expiry) return false;
        const days = Math.ceil((member.expiry - now) / 86400000);
        return days >= 0 && days <= 7;
      })
      .sort((a, b) => a.expiry - b.expiry);

    return res.json({
      totalMembers: members.length,
      activeMembers,
      monthlyRevenue,
      pendingPayments,
      recentMembers,
      upcomingExpiries,
    });
  } catch (error) {
    console.error("Dashboard stats failed:", error);
    return res.status(500).json({ error: "Could not load dashboard stats." });
  }
});

module.exports = router;
