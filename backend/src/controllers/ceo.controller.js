// What this does: CEO dashboard endpoints (overview, cashflow, alerts, stock lifecycle) using Prisma
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

// =======================================================
// DATE RANGE HELPERS (Kigali-safe day boundaries: UTC+2)
// =======================================================
const KIGALI_OFFSET_MS = 2 * 60 * 60 * 1000;

function toKigaliParts(dateUtc = new Date()) {
  // What this does: converts a UTC date to Kigali "local" date parts by applying UTC+2 offset
  const k = new Date(dateUtc.getTime() + KIGALI_OFFSET_MS);
  return {
    year: k.getUTCFullYear(),
    month: k.getUTCMonth(), // 0-based
    day: k.getUTCDate(),
    dow: k.getUTCDay(), // 0 Sunday ... 6 Saturday (in Kigali-local representation)
  };
}

function kigaliMidnightUtc(year, month0, day) {
  // What this does: returns a UTC Date representing 00:00 Kigali time for the given Kigali date
  const utcMs = Date.UTC(year, month0, day, 0, 0, 0, 0) - KIGALI_OFFSET_MS;
  return new Date(utcMs);
}

function rangeFromPeriod(period) {
  // What this does: returns { start, end, from, to, period } for period shortcuts in Kigali timezone
  const now = new Date();
  const p = String(period || "").trim().toLowerCase();

  const { year, month, day, dow } = toKigaliParts(now);

  let start;
  let end;

  if (p === "today") {
    start = kigaliMidnightUtc(year, month, day);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else if (p === "this_week") {
    // Week starts Monday
    // Kigali dow: 1 = Monday ... 0 = Sunday
    const mondayDelta = dow === 0 ? 6 : dow - 1;
    const mondayDay = day - mondayDelta;

    start = kigaliMidnightUtc(year, month, mondayDay);
    end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  } else if (p === "this_month") {
    start = kigaliMidnightUtc(year, month, 1);

    const nextMonthStartUtc = kigaliMidnightUtc(
      month === 11 ? year + 1 : year,
      month === 11 ? 0 : month + 1,
      1
    );
    end = new Date(nextMonthStartUtc.getTime() - 1);
  } else if (p === "this_year") {
    start = kigaliMidnightUtc(year, 0, 1);
    const nextYearStartUtc = kigaliMidnightUtc(year + 1, 0, 1);
    end = new Date(nextYearStartUtc.getTime() - 1);
  } else {
    // Default to today if period not provided
    start = kigaliMidnightUtc(year, month, day);
    end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  // Human-friendly "from/to" strings (YYYY-MM-DD in Kigali)
  const from = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { start, end, from, to: null, period: p || "today" };
}

function rangeFromQuery(query) {
  // What this does: supports either ?period=... or ?from=YYYY-MM-DD&to=YYYY-MM-DD
  const period = query.period;

  if (query.from && query.to) {
    const fromStr = String(query.from).trim();
    const toStr = String(query.to).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromStr) || !/^\d{4}-\d{2}-\d{2}$/.test(toStr)) {
      const err = new Error("from/to must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }

    // Interpret from/to as Kigali dates
    const [fy, fm, fd] = fromStr.split("-").map(Number);
    const [ty, tm, td] = toStr.split("-").map(Number);

    const start = kigaliMidnightUtc(fy, fm - 1, fd);
    const end = new Date(kigaliMidnightUtc(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000 - 1);

    return { start, end, from: fromStr, to: toStr, period: null };
  }

  return rangeFromPeriod(period || "today");
}

function n(v) {
  // What this does: converts prisma Decimal/unknown into a safe Number
  const x = Number(v || 0);
  return Number.isNaN(x) ? 0 : x;
}

function round2(x) {
  return Number(n(x).toFixed(2));
}

// ======================================
// CEO: OVERVIEW (Revenue, Profit, EBM...)
// GET /api/ceo/overview?period=...
// ======================================
exports.overview = async (req, res) => {
  try {
    const { start, end, from, to, period } = rangeFromQuery(req.query);

    const result = await prisma.$transaction(async (tx) => {
      // 1) Revenue + sale count
      const salesAgg = await tx.sale.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { total: true },
        _count: { _all: true },
      });

      // 2) Payment split
      const paymentSplit = await tx.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: start, lte: end } },
        _sum: { total: true },
        _count: { _all: true },
      });

      // 3) EBM pending stats
      const ebmPendingAgg = await tx.sale.aggregate({
        where: { createdAt: { gte: start, lte: end }, ebmStatus: "PENDING" },
        _count: { _all: true },
        _sum: { total: true },
      });

      // 4) Returns count (value calculation not stored yet; we’ll count operations + items)
      const returnsCount = await tx.saleReturn.count({
        where: { createdAt: { gte: start, lte: end } },
      });

      const returnItemsAgg = await tx.saleReturnItem.aggregate({
        where: {
          return: { createdAt: { gte: start, lte: end } },
        },
        _sum: { quantity: true },
      });

      // 5) Profit estimate: Revenue − estimated COGS
      // COGS uses Product.costPrice * quantitySold for the period (estimated)
      const soldByProduct = await tx.saleItem.groupBy({
        by: ["productId"],
        where: { createdAt: { gte: start, lte: end } },
        _sum: { quantity: true },
      });

      const productIds = soldByProduct.map((x) => x.productId);
      const products = productIds.length
        ? await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, costPrice: true, name: true },
        })
        : [];

      const costMap = new Map(products.map((p) => [p.id, n(p.costPrice)]));

      let estimatedCogs = 0;
      for (const row of soldByProduct) {
        const qty = Number(row._sum.quantity || 0);
        const unitCost = costMap.get(row.productId) || 0;
        estimatedCogs += unitCost * qty;
      }

      const revenue = n(salesAgg._sum.total);
      const profitEstimate = revenue - estimatedCogs;

      return {
        salesCount: salesAgg._count._all,
        revenue,
        paymentSplit,
        ebmPending: {
          count: ebmPendingAgg._count._all,
          amount: n(ebmPendingAgg._sum.total),
        },
        returns: {
          count: returnsCount,
          itemsQty: Number(returnItemsAgg._sum.quantity || 0),
          note: "Return value not calculated yet (SaleReturnItem has no price).",
        },
        estimatedCogs,
        profitEstimate,
      };
    });

    return res.json({
      range: { from, to, period, start, end },
      overview: {
        salesCount: result.salesCount,
        revenue: round2(result.revenue),
        estimatedCogs: round2(result.estimatedCogs),
        profitEstimate: round2(result.profitEstimate),
      },
      paymentSplit: result.paymentSplit.map((p) => ({
        paymentMethod: p.paymentMethod,
        count: p._count._all,
        amount: round2(p._sum.total),
      })),
      ebm: {
        pendingCount: result.ebmPending.count,
        pendingAmount: round2(result.ebmPending.amount),
      },
      returns: result.returns,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ======================================
// CEO: CASHFLOW (Sales inflow by method)
// GET /api/ceo/cashflow?period=...
// ======================================
// ======================================
// CEO: CASHFLOW (Sales inflow - Expenses outflow)
// GET /api/ceo/cashflow?period=... OR ?from&to
// ======================================
// FILE: src/controllers/ceo.controller.js
// What this does: updates CEO cashflow to ignore soft-deleted expenses (isDeleted = false)

// ======================================
// CEO: CASHFLOW (Sales inflow - Expenses outflow)
// GET /api/ceo/cashflow?period=... OR ?from&to
// ✅ Change: expense queries now include { isDeleted: false }
// ======================================
exports.cashflow = async (req, res) => {
  try {
    const { start, end, from, to, period } = rangeFromQuery(req.query);

    const result = await prisma.$transaction(async (tx) => {
      // Inflow from sales (split by payment method)
      const inflowSplit = await tx.sale.groupBy({
        by: ["paymentMethod"],
        where: { createdAt: { gte: start, lte: end } },
        _sum: { total: true },
        _count: { _all: true },
      });

      // ✅ Outflow from expenses (ignore deleted)
      const outflowByPayment = await tx.expense.groupBy({
        by: ["paymentMethod"],
        where: { isDeleted: false, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      });

      // ✅ Outflow by category (ignore deleted)
      const outflowByCategory = await tx.expense.groupBy({
        by: ["category"],
        where: { isDeleted: false, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      });

      const totalIn = inflowSplit.reduce((acc, x) => acc + n(x._sum.total), 0);
      const totalOut = outflowByPayment.reduce((acc, x) => acc + n(x._sum.amount), 0);

      return { inflowSplit, outflowByPayment, outflowByCategory, totalIn, totalOut };
    });

    return res.json({
      range: { from, to, period, start, end },
      inflow: result.inflowSplit.map((x) => ({
        paymentMethod: x.paymentMethod,
        count: x._count._all,
        amount: round2(x._sum.total),
      })),
      outflow: {
        byPaymentMethod: result.outflowByPayment.map((x) => ({
          paymentMethod: x.paymentMethod,
          count: x._count._all,
          amount: round2(x._sum.amount),
        })),
        byCategory: result.outflowByCategory.map((x) => ({
          category: x.category,
          count: x._count._all,
          amount: round2(x._sum.amount),
        })),
        total: round2(result.totalOut),
      },
      totals: {
        inflow: round2(result.totalIn),
        outflow: round2(result.totalOut),
        net: round2(result.totalIn - result.totalOut),
      },
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};



// ======================================
// CEO: ALERTS (low stock, pending EBM, negative stock)
// GET /api/ceo/alerts?locationId=...
// ======================================
exports.alerts = async (req, res) => {
  try {
    const locationId = req.query.locationId ? String(req.query.locationId).trim() : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1) Low stock: total qty across bins/locations <= minStock
      const invGroups = await tx.inventory.groupBy({
        by: ["productId"],
        where: locationId ? { locationId } : undefined,
        _sum: { quantity: true },
      });

      const productIds = invGroups.map((x) => x.productId);

      const products = productIds.length
        ? await tx.product.findMany({
          where: { id: { in: productIds }, isActive: true },
          select: { id: true, name: true, sku: true, partNumber: true, minStock: true },
        })
        : [];

      const pMap = new Map(products.map((p) => [p.id, p]));

      const lowStock = invGroups
        .map((g) => {
          const p = pMap.get(g.productId);
          if (!p) return null;
          const qty = Number(g._sum.quantity || 0);
          if (p.minStock != null && qty <= p.minStock) {
            return { product: p, totalQty: qty, minStock: p.minStock };
          }
          return null;
        })
        .filter(Boolean);

      // 2) Pending EBM by cashier (count + amount)
      const pendingByCashier = await tx.sale.groupBy({
        by: ["cashierId"],
        where: {
          ebmStatus: "PENDING",
          ...(locationId
            ? {
              // sale has no location; we don't filter by location here
            }
            : {}),
        },
        _count: { _all: true },
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
      });

      const cashierIds = pendingByCashier.map((x) => x.cashierId);
      const cashiers = cashierIds.length
        ? await tx.user.findMany({
          where: { id: { in: cashierIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
        : [];
      const cMap = new Map(cashiers.map((c) => [c.id, c]));

      // 3) Negative stock guard
      const negative = await tx.inventory.findMany({
        where: {
          quantity: { lt: 0 },
          ...(locationId ? { locationId } : {}),
        },
        include: {
          product: { select: { id: true, name: true, sku: true, partNumber: true } },
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true } },
        },
        orderBy: { quantity: "asc" },
      });

      return {
        lowStock,
        pendingByCashier,
        cMap,
        negative,
      };
    });

    return res.json({
      locationFilter: locationId || null,
      lowStock: result.lowStock,
      ebmPendingByCashier: result.pendingByCashier.map((x) => ({
        cashier: result.cMap.get(x.cashierId) || { id: x.cashierId },
        invoices: x._count._all,
        amount: round2(x._sum.total),
      })),
      negativeStock: result.negative.map((row) => ({
        product: row.product,
        location: row.location,
        bin: row.bin,
        quantity: row.quantity,
      })),
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ======================================
// CEO: STOCK LIFECYCLE (per product)
// GET /api/ceo/stock-lifecycle?productId=...
// ======================================
exports.stockLifecycle = async (req, res) => {
  try {
    const productId = req.query.productId ? String(req.query.productId).trim() : null;
    if (!productId) return res.status(400).json({ message: "productId is required" });

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
          partNumber: true,
          brand: true,
          category: true,
          modelCompatibility: true,
          costPrice: true,
          sellPrice: true,
          minStock: true,
        },
      });
      if (!product) throw Object.assign(new Error("Product not found"), { status: 404 });

      // Current inventory by bin
      const inventory = await tx.inventory.findMany({
        where: { productId },
        include: {
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true, description: true } },
        },
        orderBy: [{ locationId: "asc" }, { binId: "asc" }],
      });

      // Stock transactions (IN/OUT/DAMAGE)
      const stockTx = await tx.stockTransaction.findMany({
        where: { productId },
        include: {
          location: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      // Sales (OUT via SaleItem)
      const saleItems = await tx.saleItem.findMany({
        where: { productId },
        include: {
          sale: {
            select: {
              id: true,
              invoiceNo: true,
              createdAt: true,
              paymentMethod: true,
              ebmStatus: true,
              buyerTin: true,
              buyerType: true,
            },
          },
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });

      // Returns (back to stock)
      const returnItems = await tx.saleReturnItem.findMany({
        where: { productId },
        include: {
          return: {
            select: {
              id: true,
              createdAt: true,
              reason: true,
              sale: { select: { invoiceNo: true } },
            },
          },
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true } },
        },
        orderBy: { id: "desc" },
        take: 200,
      });

      return { product, inventory, stockTx, saleItems, returnItems };
    });

    // Build a unified timeline (optional but super useful for CEO)
    const timeline = [];

    for (const t of result.stockTx) {
      timeline.push({
        at: t.createdAt,
        type: `STOCK_${t.type}`,
        qty: t.quantity,
        location: t.location?.name,
        ref: t.reason || null,
        by: t.user?.fullName || null,
        unitCost: t.unitCost != null ? round2(t.unitCost) : null,
      });
    }

    for (const si of result.saleItems) {
      timeline.push({
        at: si.sale.createdAt,
        type: "SALE_OUT",
        qty: si.quantity,
        location: si.location?.name,
        bin: si.bin?.code,
        ref: si.sale.invoiceNo,
        paymentMethod: si.sale.paymentMethod,
        ebmStatus: si.sale.ebmStatus,
        unitPrice: round2(si.unitPrice),
        lineTotal: round2(si.lineTotal),
      });
    }

    for (const ri of result.returnItems) {
      timeline.push({
        at: ri.return.createdAt,
        type: "RETURN_IN",
        qty: ri.quantity,
        location: ri.location?.name,
        bin: ri.bin?.code,
        ref: ri.return.sale?.invoiceNo || null,
        reason: ri.return.reason,
      });
    }

    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return res.json({
      product: result.product,
      inventory: result.inventory.map((x) => ({
        location: x.location,
        bin: x.bin,
        quantity: x.quantity,
        updatedAt: x.updatedAt,
      })),
      timeline,
      note: "Timeline merges StockTransaction + SaleItem OUT + Returns IN.",
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

