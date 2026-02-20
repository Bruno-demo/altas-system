// FILE: src/controllers/reports.export.controller.js
// What this does: exports manager reports to an Excel workbook (multi-sheet) using period shortcuts + SalesList + EBM sheets
const { createWorkbook } = require("../utils/safeExcel");
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

// What this does: builds date range using either (from,to) OR period shortcuts
function resolveRange(query) {
  const { from, to, period } = query;

  if (from && to) {
    const start = new Date(`${from}T00:00:00.000`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      const err = new Error("Invalid from/to date. Use YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    return { start, end, from, to, period: null };
  }

  if (!period) {
    const err = new Error(
      "Provide either from & to OR period=today|this_week|this_month|this_year"
    );
    err.status = 400;
    throw err;
  }

  const now = new Date();
  let start, end;
  let labelFrom, labelTo;

  const p = String(period).toLowerCase();

  if (p === "today") {
    labelFrom = now.toISOString().slice(0, 10);
    labelTo = labelFrom;
    start = new Date(`${labelFrom}T00:00:00.000`);
    end = new Date(`${labelTo}T23:59:59.999`);
  } else if (p === "this_week") {
    const day = now.getDay(); // 0 Sun ... 6 Sat
    const diffToMonday = (day === 0 ? -6 : 1) - day;

    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    labelFrom = monday.toISOString().slice(0, 10);
    start = new Date(`${labelFrom}T00:00:00.000`);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    labelTo = sunday.toISOString().slice(0, 10);
    end = new Date(`${labelTo}T23:59:59.999`);
  } else if (p === "this_month") {
    const y = now.getFullYear();
    const m = now.getMonth();

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    labelFrom = first.toISOString().slice(0, 10);
    labelTo = last.toISOString().slice(0, 10);

    start = new Date(`${labelFrom}T00:00:00.000`);
    end = new Date(`${labelTo}T23:59:59.999`);
  } else if (p === "this_year") {
    const y = now.getFullYear();
    labelFrom = `${y}-01-01`;
    labelTo = `${y}-12-31`;

    start = new Date(`${labelFrom}T00:00:00.000`);
    end = new Date(`${labelTo}T23:59:59.999`);
  } else {
    const err = new Error("period must be today|this_week|this_month|this_year");
    err.status = 400;
    throw err;
  }

  return { start, end, from: labelFrom, to: labelTo, period: p };
}

// What this does: applies a simple nice style to worksheet header row
function styleHeaderRow(ws) {
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 18;
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

// What this does: safely converts Prisma Decimal/unknown values to Number
function toNum(v) {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

exports.exportExcel = async (req, res) => {
  try {
    const { start, end, from, to, period } = resolveRange(req.query);

    // -------------------------------
    // Collect data (same logic as your API reports)
    // -------------------------------
    const [salesCount, salesAgg, returnsCount] = await prisma.$transaction([
      prisma.sale.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _sum: { subtotal: true, discountTotal: true, taxTotal: true, total: true },
      }),
      prisma.saleReturn.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);

    const byPayment = await prisma.sale.groupBy({
      by: ["paymentMethod"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { total: true },
      _count: { _all: true },
    });

    const best = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 50,
    });

    const movement = await prisma.stockTransaction.groupBy({
      by: ["type"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    // ✅ NEW: fetch all sales for SalesList sheet
    const salesList = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: {
        invoiceNo: true,
        createdAt: true,
        paymentMethod: true,
        subtotal: true,
        discountTotal: true,
        taxTotal: true,
        total: true,

        buyerType: true,
        buyerTin: true,
        buyerName: true,
        buyerPhone: true,

        ebmStatus: true,
        ebmReceiptSignature: true,
        ebmIssuedAt: true,

        cashier: { select: { fullName: true } },

        // What this does: counts line items without pulling all item details
        items: { select: { id: true } },
      },
    });

    // ✅ NEW: group EBM status counts and totals
    const ebmGrouped = await prisma.sale.groupBy({
      by: ["ebmStatus"],
      where: { createdAt: { gte: start, lte: end } },
      _count: { _all: true },
      _sum: { total: true },
    });

    // Profit data (weighted avg cost using Stock IN history)
    const soldGrouped = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: { createdAt: { gte: start, lte: end } },
      _sum: { quantity: true, lineTotal: true },
    });

    const productIds = soldGrouped.map((g) => g.productId);
    const products = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, name: true, sku: true, partNumber: true, brand: true, category: true },
        })
      : [];

    const pmap = new Map(products.map((p) => [p.id, p]));

    const ins = productIds.length
      ? await prisma.stockTransaction.findMany({
          where: { type: "IN", productId: { in: productIds }, unitCost: { not: null } },
          select: { productId: true, unitCost: true, quantity: true },
        })
      : [];

    const costMap = new Map(); // productId -> { totalCost, totalQty }
    for (const t of ins) {
      const pid = t.productId;
      const qty = toNum(t.quantity);
      const cost = toNum(t.unitCost);
      if (qty <= 0 || cost < 0) continue;

      if (!costMap.has(pid)) costMap.set(pid, { totalCost: 0, totalQty: 0 });
      const x = costMap.get(pid);
      x.totalCost += cost * qty;
      x.totalQty += qty;
    }

    const revenue = toNum(salesAgg._sum.total);
    let cogsEstimated = 0;

    const profitItems = soldGrouped
      .map((g) => {
        const qtySold = toNum(g._sum.quantity);
        const salesAmount = toNum(g._sum.lineTotal);

        const costInfo = costMap.get(g.productId);
        const avgUnitCost =
          costInfo && costInfo.totalQty > 0 ? costInfo.totalCost / costInfo.totalQty : 0;

        const cogs = avgUnitCost * qtySold;
        cogsEstimated += cogs;

        const pr = pmap.get(g.productId) || {};
        return {
          name: pr.name || "Unknown",
          sku: pr.sku || "",
          partNumber: pr.partNumber || "",
          brand: pr.brand || "",
          category: pr.category || "",
          qtySold,
          salesAmount,
          avgUnitCost: Number(avgUnitCost.toFixed(2)),
          cogsEstimated: Number(cogs.toFixed(2)),
          grossProfit: Number((salesAmount - cogs).toFixed(2)),
        };
      })
      .sort((a, b) => b.grossProfit - a.grossProfit);

    const grossProfit = revenue - cogsEstimated;
    const marginPct = revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : null;

    // Best sellers with product info
    const bestIds = best.map((b) => b.productId);
    const bestProducts = bestIds.length
      ? await prisma.product.findMany({
          where: { id: { in: bestIds } },
          select: { id: true, name: true, sku: true, partNumber: true, brand: true, category: true },
        })
      : [];
    const bestMap = new Map(bestProducts.map((p) => [p.id, p]));

    // -------------------------------
    // Build Excel workbook
    // -------------------------------
    const workbook = await createWorkbook();
    workbook.creator = "Altas System";
    workbook.created = new Date();

    // Sheet 1: Summary
    const wsSummary = workbook.addWorksheet("Summary");
    wsSummary.columns = [
      { header: "From", key: "from", width: 14 },
      { header: "To", key: "to", width: 14 },
      { header: "Period", key: "period", width: 14 },
      { header: "Invoices", key: "invoices", width: 10 },
      { header: "Subtotal", key: "subtotal", width: 14 },
      { header: "Discount", key: "discount", width: 14 },
      { header: "Tax", key: "tax", width: 14 },
      { header: "Total", key: "total", width: 14 },
      { header: "Returns", key: "returns", width: 10 },
    ];
    styleHeaderRow(wsSummary);
    wsSummary.addRow({
      from,
      to,
      period: period || "",
      invoices: salesCount,
      subtotal: toNum(salesAgg._sum.subtotal),
      discount: toNum(salesAgg._sum.discountTotal),
      tax: toNum(salesAgg._sum.taxTotal),
      total: toNum(salesAgg._sum.total),
      returns: returnsCount,
    });

    // Sheet 2: SalesByPayment
    const wsPay = workbook.addWorksheet("SalesByPayment");
    wsPay.columns = [
      { header: "PaymentMethod", key: "pm", width: 14 },
      { header: "Invoices", key: "inv", width: 10 },
      { header: "Total", key: "total", width: 14 },
    ];
    styleHeaderRow(wsPay);
    byPayment.forEach((g) => {
      wsPay.addRow({
        pm: g.paymentMethod,
        inv: g._count._all,
        total: toNum(g._sum.total),
      });
    });

    // Sheet 3: BestSellers
    const wsBest = workbook.addWorksheet("BestSellers");
    wsBest.columns = [
      { header: "Product", key: "name", width: 30 },
      { header: "SKU", key: "sku", width: 16 },
      { header: "PartNumber", key: "pn", width: 18 },
      { header: "Brand", key: "brand", width: 14 },
      { header: "Category", key: "cat", width: 14 },
      { header: "QtySold", key: "qty", width: 10 },
      { header: "Revenue", key: "rev", width: 14 },
    ];
    styleHeaderRow(wsBest);
    best.forEach((b) => {
      const p = bestMap.get(b.productId) || {};
      wsBest.addRow({
        name: p.name || "Unknown",
        sku: p.sku || "",
        pn: p.partNumber || "",
        brand: p.brand || "",
        cat: p.category || "",
        qty: toNum(b._sum.quantity),
        rev: toNum(b._sum.lineTotal),
      });
    });

    // Sheet 4: Profit
    const wsProfit = workbook.addWorksheet("Profit");
    wsProfit.columns = [
      { header: "Revenue", key: "rev", width: 14 },
      { header: "COGS_Estimated", key: "cogs", width: 18 },
      { header: "GrossProfit", key: "gp", width: 14 },
      { header: "MarginPct", key: "mp", width: 12 },
    ];
    styleHeaderRow(wsProfit);
    wsProfit.addRow({
      rev: Number(revenue.toFixed(2)),
      cogs: Number(cogsEstimated.toFixed(2)),
      gp: Number(grossProfit.toFixed(2)),
      mp: marginPct == null ? "" : marginPct,
    });

    wsProfit.addRow([]);
    wsProfit.addRow(["Item breakdown (weighted avg cost)"]);
    wsProfit.addRow([]);

    wsProfit.addRow([
      "Product",
      "SKU",
      "PartNumber",
      "Brand",
      "Category",
      "QtySold",
      "SalesAmount",
      "AvgUnitCost",
      "COGS_Est",
      "GrossProfit",
    ]);
    wsProfit.getRow(wsProfit.lastRow.number).font = { bold: true };

    profitItems.forEach((it) => {
      wsProfit.addRow([
        it.name,
        it.sku,
        it.partNumber,
        it.brand,
        it.category,
        it.qtySold,
        Number(it.salesAmount.toFixed(2)),
        it.avgUnitCost,
        it.cogsEstimated,
        it.grossProfit,
      ]);
    });

    // Sheet 5: StockMovement
    const wsMove = workbook.addWorksheet("StockMovement");
    wsMove.columns = [
      { header: "Type", key: "type", width: 12 },
      { header: "Transactions", key: "tx", width: 14 },
      { header: "Quantity", key: "qty", width: 12 },
    ];
    styleHeaderRow(wsMove);
    movement.forEach((m) => {
      wsMove.addRow({
        type: m.type,
        tx: m._count._all,
        qty: toNum(m._sum.quantity),
      });
    });

    // ✅ Sheet 6: SalesList (every invoice)
    const wsSales = workbook.addWorksheet("SalesList");
    wsSales.columns = [
      { header: "InvoiceNo", key: "invoiceNo", width: 18 },
      { header: "DateTime", key: "createdAt", width: 22 },
      { header: "Cashier", key: "cashier", width: 18 },

      { header: "BuyerType", key: "buyerType", width: 12 },
      { header: "BuyerTIN", key: "buyerTin", width: 18 },
      { header: "BuyerName", key: "buyerName", width: 22 },
      { header: "BuyerPhone", key: "buyerPhone", width: 16 },

      { header: "Payment", key: "paymentMethod", width: 12 },
      { header: "ItemsCount", key: "itemsCount", width: 12 },

      { header: "Subtotal", key: "subtotal", width: 14 },
      { header: "Discount", key: "discountTotal", width: 14 },
      { header: "Tax", key: "taxTotal", width: 14 },
      { header: "Total", key: "total", width: 14 },

      { header: "EBMStatus", key: "ebmStatus", width: 14 },
      { header: "EBMSignature", key: "ebmReceiptSignature", width: 28 },
      { header: "EBMIssuedAt", key: "ebmIssuedAt", width: 22 },
    ];
    styleHeaderRow(wsSales);

    salesList.forEach((s) => {
      wsSales.addRow({
        invoiceNo: s.invoiceNo,
        createdAt: new Date(s.createdAt).toLocaleString(),
        cashier: s.cashier?.fullName || "",

        buyerType: s.buyerType || "",
        buyerTin: s.buyerTin || "",
        buyerName: s.buyerName || "",
        buyerPhone: s.buyerPhone || "",

        paymentMethod: s.paymentMethod,
        itemsCount: Array.isArray(s.items) ? s.items.length : 0,

        subtotal: toNum(s.subtotal),
        discountTotal: toNum(s.discountTotal),
        taxTotal: toNum(s.taxTotal),
        total: toNum(s.total),

        ebmStatus: s.ebmStatus || "",
        ebmReceiptSignature: s.ebmReceiptSignature || "",
        ebmIssuedAt: s.ebmIssuedAt ? new Date(s.ebmIssuedAt).toLocaleString() : "",
      });
    });

    // ✅ Sheet 7: EBM (status summary)
    const wsEbm = workbook.addWorksheet("EBM");
    wsEbm.columns = [
      { header: "EBMStatus", key: "status", width: 16 },
      { header: "Invoices", key: "count", width: 12 },
      { header: "TotalAmount", key: "total", width: 16 },
    ];
    styleHeaderRow(wsEbm);

    ebmGrouped.forEach((g) => {
      wsEbm.addRow({
        status: g.ebmStatus,
        count: g._count._all,
        total: toNum(g._sum.total),
      });
    });

    wsEbm.addRow([]);
    wsEbm.addRow([
      "Tip: SIGNED = confirmed EBM, PENDING = waiting confirmation, NOT_REQUIRED = walk-in (your rule).",
    ]);

    // Auto number formatting for numeric cells
    [wsSummary, wsPay, wsBest, wsProfit, wsMove, wsSales, wsEbm].forEach((ws) => {
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        row.eachCell((cell) => {
          if (typeof cell.value === "number") cell.numFmt = "#,##0.00";
        });
      });
    });

    // -------------------------------
    // Send file response
    // -------------------------------
    const filename = `ALTAS_Report_${from}_to_${to}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

