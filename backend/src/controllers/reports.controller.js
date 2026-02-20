// What this does: returns daily totals grouped by payment method (cashier sees own; manager/ceo sees all)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

exports.dailyReport = async (req, res) => {
  try {
    const dateStr = req.query.date; // "2026-01-16"
    if (!dateStr) return res.status(400).json({ message: "date=YYYY-MM-DD is required" });

    const start = new Date(`${dateStr}T00:00:00.000`);
    const end = new Date(`${dateStr}T23:59:59.999`);

    const where = {
      createdAt: { gte: start, lte: end },
    };

    // Cashier sees own totals only
    if (req.user.role === "CASHIER") where.cashierId = req.user.id;

    const sales = await prisma.sale.findMany({
      where,
      select: {
        total: true,
        subtotal: true,
        discountTotal: true,
        paymentMethod: true,
        cashierId: true,
      },
    });

    const summary = {
      date: dateStr,
      countInvoices: sales.length,
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      byPayment: {},
    };

    for (const s of sales) {
      const t = Number(s.total);
      const sub = Number(s.subtotal);
      const disc = Number(s.discountTotal);

      summary.total += t;
      summary.subtotal += sub;
      summary.discountTotal += disc;

      const key = s.paymentMethod;
      summary.byPayment[key] = (summary.byPayment[key] || 0) + t;
    }

    res.json(summary);
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

