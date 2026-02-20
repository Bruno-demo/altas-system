// What this does: provides invoice list + sale details with filters and role rules
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;

function kigaliMidnightUtc(year, month0, day) {
  // What this does: returns UTC date for Kigali 00:00
  return new Date(Date.UTC(year, month0, day, 0, 0, 0, 0) - KIGALI_OFFSET_MS);
}

function toKigaliParts(dateUtc = new Date()) {
  // What this does: converts UTC to Kigali date parts
  const k = new Date(dateUtc.getTime() + KIGALI_OFFSET_MS);
  return { year: k.getUTCFullYear(), month: k.getUTCMonth(), day: k.getUTCDate(), dow: k.getUTCDay() };
}

function rangeFromQuery(q) {
  // What this does: supports ?period=today|this_week|this_month|this_year OR ?from&to (YYYY-MM-DD)
  if (q.from && q.to) {
    const fromStr = String(q.from).trim();
    const toStr = String(q.to).trim();

    const [fy, fm, fd] = fromStr.split("-").map(Number);
    const [ty, tm, td] = toStr.split("-").map(Number);

    const start = kigaliMidnightUtc(fy, fm - 1, fd);
    const end = new Date(kigaliMidnightUtc(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end, from: fromStr, to: toStr, period: null };
  }

  const period = String(q.period || "today").trim().toLowerCase();
  const now = new Date();
  const { year, month, day, dow } = toKigaliParts(now);

  let start;
  let end;

  if (period === "today") {
    start = kigaliMidnightUtc(year, month, day);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else if (period === "this_week") {
    const mondayDelta = dow === 0 ? 6 : dow - 1;
    start = kigaliMidnightUtc(year, month, day - mondayDelta);
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (period === "this_month") {
    start = kigaliMidnightUtc(year, month, 1);
    const nextMonthStart = kigaliMidnightUtc(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1, 1);
    end = new Date(nextMonthStart.getTime() - 1);
  } else if (period === "this_year") {
    start = kigaliMidnightUtc(year, 0, 1);
    end = new Date(kigaliMidnightUtc(year + 1, 0, 1).getTime() - 1);
  } else {
    start = kigaliMidnightUtc(year, month, day);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  return { start, end, from: null, to: null, period };
}

function s(v) {
  if (v == null) return "";
  return String(v).trim();
}

// ✅ GET /api/sales?period=&from=&to=&q=&locationId=&page=&limit=
exports.listSales = async (req, res) => {
  try {
    const { start, end, from, to, period } = rangeFromQuery(req.query);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const q = s(req.query.q);
    const locationId = s(req.query.locationId);

    const where = {
      createdAt: { gte: start, lte: end },
    };

    // What this does: cashier only sees own invoices
    if (req.user.role === "CASHIER") {
      where.cashierId = req.user.id;
    }

    // What this does: search invoiceNo/buyer fields/payment method
    if (q) {
      where.OR = [
        { invoiceNo: { contains: q, mode: "insensitive" } },
        { buyerTin: { contains: q, mode: "insensitive" } },
        { buyerName: { contains: q, mode: "insensitive" } },
        { buyerPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    if (locationId) {
      where.items = { some: { locationId } };
    }

    const [total, rows] = await prisma.$transaction([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          invoiceNo: true,
          createdAt: true,
          total: true,
          paymentMethod: true,
          buyerType: true,
          buyerTin: true,
          buyerName: true,
          buyerPhone: true,
          ebmStatus: true,
          cashier: { select: { fullName: true } },
        },
      }),
    ]);

    return res.json({
      range: { period, from, to, start, end },
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      rows,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/sales/:id
exports.getSaleById = async (req, res) => {
  try {
    const id = String(req.params.id).trim();

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, fullName: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, partNumber: true } },
            location: { select: { name: true } },
            bin: { select: { code: true } },
          },
        },
      },
    });

    if (!sale) return res.status(404).json({ message: "Sale not found" });

    if (req.user.role === "CASHIER" && sale.cashierId !== req.user.id) {
      return res.status(403).json({ message: "You can only view your own invoices" });
    }

    return res.json({ sale });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};


