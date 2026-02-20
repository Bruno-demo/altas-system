// What this does: cashier shift open/close with reconciliation (expected totals from sales vs cashier counted totals)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

function num(v) {
  const n = Number(v || 0);
  return Number.isNaN(n) ? 0 : n;
}

function moneyStr(n) {
  return num(n).toFixed(2);
}

// ✅ POST /api/pos/shift/open
// Body: { note? }
exports.openShift = async (req, res) => {
  try {
    const note = req.body?.note ? String(req.body.note).trim() : null;

    const shift = await prisma.$transaction(async (tx) => {
      const existing = await tx.cashierShift.findFirst({
        where: { cashierId: req.user.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      if (existing) return existing;

      const created = await tx.cashierShift.create({
        data: {
          cashierId: req.user.id,
          status: "OPEN",
          note,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "POS_SHIFT_OPEN",
          details: `Opened shift ${created.id}`,
        },
      });

      return created;
    });

    return res.status(201).json({ message: "Shift open", shift });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

// ✅ GET /api/pos/shift/open
exports.getMyOpenShift = async (req, res) => {
  try {
    const shift = await prisma.cashierShift.findFirst({
      where: { cashierId: req.user.id, status: "OPEN" },
      orderBy: { openedAt: "desc" },
    });

    return res.json({ shift: shift || null });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

// ✅ POST /api/pos/shift/close
// Body: { counted: { CASH?, MOMO?, CARD?, BANK?, OTHER? }, note? }
exports.closeShift = async (req, res) => {
  try {
    const counted = req.body?.counted || {};
    const note = req.body?.note ? String(req.body.note).trim() : null;

    const result = await prisma.$transaction(async (tx) => {
      const shift = await tx.cashierShift.findFirst({
        where: { cashierId: req.user.id, status: "OPEN" },
        orderBy: { openedAt: "desc" },
      });

      if (!shift) {
        const err = new Error("No OPEN shift found. Open shift first.");
        err.status = 400;
        throw err;
      }

      // What this does: compute expected totals from sales in shift time window for this cashier
      const expectedByMethod = await tx.sale.groupBy({
        by: ["paymentMethod"],
        where: {
          cashierId: req.user.id,
          shiftId: shift.id, // ✅ ensures only linked sales; you will add shiftId in createSale
        },
        _sum: { total: true },
        _count: { _all: true },
      });

      const expectedMap = new Map(expectedByMethod.map((x) => [x.paymentMethod, Number(x._sum.total || 0)]));
      const salesCount = expectedByMethod.reduce((acc, x) => acc + x._count._all, 0);

      const expCash = expectedMap.get("CASH") || 0;
      const expMomo = expectedMap.get("MOMO") || 0;
      const expCard = expectedMap.get("CARD") || 0;
      const expBank = expectedMap.get("BANK") || 0;
      const expOther = expectedMap.get("OTHER") || 0;
      const expTotal = expCash + expMomo + expCard + expBank + expOther;

      // What this does: read cashier counted totals
      const cCash = num(counted.CASH);
      const cMomo = num(counted.MOMO);
      const cCard = num(counted.CARD);
      const cBank = num(counted.BANK);
      const cOther = num(counted.OTHER);
      const cTotal = cCash + cMomo + cCard + cBank + cOther;

      // Differences
      const dCash = cCash - expCash;
      const dMomo = cMomo - expMomo;
      const dCard = cCard - expCard;
      const dBank = cBank - expBank;
      const dOther = cOther - expOther;
      const dTotal = cTotal - expTotal;

      const closed = await tx.cashierShift.update({
        where: { id: shift.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          note: note || shift.note,

          expectedCash: moneyStr(expCash),
          expectedMomo: moneyStr(expMomo),
          expectedCard: moneyStr(expCard),
          expectedBank: moneyStr(expBank),
          expectedOther: moneyStr(expOther),
          expectedTotal: moneyStr(expTotal),

          countedCash: moneyStr(cCash),
          countedMomo: moneyStr(cMomo),
          countedCard: moneyStr(cCard),
          countedBank: moneyStr(cBank),
          countedOther: moneyStr(cOther),
          countedTotal: moneyStr(cTotal),

          diffCash: moneyStr(dCash),
          diffMomo: moneyStr(dMomo),
          diffCard: moneyStr(dCard),
          diffBank: moneyStr(dBank),
          diffOther: moneyStr(dOther),
          diffTotal: moneyStr(dTotal),

          salesCount,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "POS_SHIFT_CLOSE",
          details: `Closed shift ${shift.id} expected=${expTotal.toFixed(2)} counted=${cTotal.toFixed(2)} diff=${dTotal.toFixed(2)}`,
        },
      });

      return closed;
    });

    return res.json({ message: "Shift closed", shift: result });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

