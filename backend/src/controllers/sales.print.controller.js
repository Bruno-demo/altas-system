// What this does: returns print-ready JSON and thermal receipt HTML for a sale (Altas invoice)
const prisma = require("../prisma");
const QRCode = require("qrcode");
const { handleError } = require("../utils/errors");

const COMPANY = {
  name: "AL-TAHS",
  address: "Kigali, Rwanda",
  phone: "0781600229",
  tin: "103644565",
};

function toNum(value) {
  if (value && typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const n = Number(value || 0);
  return Number.isNaN(n) ? 0 : n;
}

function round2(v) {
  const n = Number(v || 0);
  return Number.isNaN(n) ? 0 : Number(n.toFixed(2));
}

function money(v) {
  return round2(v).toFixed(2);
}

function buildInvoiceQrPayload(sale) {
  const items = sale.items.map((it) => ({
    name: it.product.name,
    qty: toNum(it.quantity),
    unitPrice: toNum(it.unitPrice),
    lineTotal: toNum(it.lineTotal),
  }));

  return JSON.stringify({
    invoiceNo: sale.invoiceNo,
    sdcId: sale.ebmInvoiceNo || null,
    createdAt: sale.createdAt,
    paymentMethod: sale.paymentMethod,
    total: toNum(sale.total),
    buyer: {
      name: sale.buyerName || null,
      tin: sale.buyerTin || null,
      phone: sale.buyerPhone || null,
    },
    items,
  });
}

function fmtDate(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")} ${String(
    x.getHours()
  ).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
}

async function loadSale(id) {
  return prisma.sale.findUnique({
    where: { id },
    include: {
      cashier: { select: { id: true, fullName: true, email: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, partNumber: true, brand: true, category: true } },
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true } },
        },
      },
    },
  });
}

// ✅ GET /api/sales/:id/print  (JSON)
exports.getSalePrintJson = async (req, res) => {
  try {
    const id = String(req.params.id).trim();
    const sale = await loadSale(id);
    if (!sale) return res.status(404).json({ message: "Sale not found" });

    // What this does: basic store/company info (hardcode now, later move to Settings table)
    const company = COMPANY;

    const buyer = {
      type: sale.buyerType,
      tin: sale.buyerTin,
      name: sale.buyerName,
      phone: sale.buyerPhone,
    };

    const items = sale.items.map((it) => ({
      productId: it.productId,
      name: it.product.name,
      sku: it.product.sku,
      partNumber: it.product.partNumber,
      brand: it.product.brand,
      category: it.product.category,
      location: it.location?.name || "-",
      bin: it.bin?.code || "MOTORBIKE",
      qty: it.quantity,
      unitPrice: money(it.unitPrice),
      discount: money(it.discount),
      lineTotal: money(it.lineTotal),
    }));

    return res.json({
      invoice: {
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        createdAt: sale.createdAt,
        createdAtText: fmtDate(sale.createdAt),
        paymentMethod: sale.paymentMethod,
        note: sale.note,
      },
      company,
      buyer,
      cashier: sale.cashier,
      totals: {
        subtotal: money(sale.subtotal),
        discountTotal: money(sale.discountTotal),
        taxTotal: money(sale.taxTotal),
        total: money(sale.total),
      },
      ebm: {
        status: sale.ebmStatus,
        signature: sale.ebmReceiptSignature,
        issuedAt: sale.ebmIssuedAt,
        qrPayload: sale.ebmQrPayload,
      },
      items,
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

// ✅ GET /api/sales/:id/receipt-html  (Thermal 80mm HTML)
exports.getSaleReceiptHtml = async (req, res) => {
  try {
    const id = String(req.params.id).trim();
    const sale = await loadSale(id);
    if (!sale) return res.status(404).send("Sale not found");

    const companyName = COMPANY.name;
    const companyPhone = COMPANY.phone;
    const companyAddr = COMPANY.address;
    const companyTin = COMPANY.tin;

    const buyerLine =
      sale.buyerType === "COMPANY" && sale.buyerTin
        ? `TIN: ${sale.buyerTin}${sale.buyerName ? " | " + sale.buyerName : ""}`
        : sale.buyerName
        ? `Customer: ${sale.buyerName}`
        : "Customer: Walk-in";

    const ebmLine = `EBM: ${sale.ebmStatus} | SDC: ${sale.ebmInvoiceNo || "PENDING"}`;

    const qrPayload = buildInvoiceQrPayload(sale);
    const qrDataUrl = await QRCode.toDataURL(qrPayload);

    // Simple thermal layout: 80mm width, monospace, compact
    const itemsHtml = sale.items
      .map((it) => {
        const name = (it.product.name || "").slice(0, 28);
        const bin = it.bin?.code || "MOTORBIKE";
        const qty = it.quantity;
        const price = money(it.unitPrice);
        const total = money(it.lineTotal);
        return `
          <div class="row">
            <div class="name">${name}</div>
            <div class="meta">BIN:${bin}  Q:${qty}  P:${price}</div>
            <div class="total">= ${total}</div>
          </div>
        `;
      })
      .join("");

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${sale.invoiceNo}</title>
  <style>
    /* What this does: thermal receipt 80mm styling */
    body { margin: 0; padding: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .receipt { width: 280px; } /* ~80mm */
    .center { text-align: center; }
    .small { font-size: 12px; }
    .line { border-top: 1px dashed #000; margin: 8px 0; }
    .row { margin: 6px 0; }
    .name { font-weight: 700; font-size: 12px; }
    .meta { font-size: 11px; }
    .total { font-size: 12px; text-align: right; }
    .totals { font-size: 12px; }
    .totals .trow { display: flex; justify-content: space-between; }
    .bold { font-weight: 800; }
    .qr { display: block; margin: 10px auto 0; width: 110px; height: 110px; }
    @media print {
      body { padding: 0; }
      .receipt { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="center bold">${companyName}</div>
    <div class="center small">${companyAddr}</div>
    <div class="center small">Tel: ${companyPhone}</div>
    <div class="center small">TIN: ${companyTin}</div>

    <div class="line"></div>

    <div class="small">Invoice: <span class="bold">${sale.invoiceNo}</span></div>
    <div class="small">Date: ${fmtDate(sale.createdAt)}</div>
    <div class="small">Cashier: ${sale.cashier.fullName}</div>
    <div class="small">${buyerLine}</div>
    <div class="small">Pay: ${sale.paymentMethod}</div>
    <div class="small">${ebmLine}</div>

    <div class="line"></div>

    ${itemsHtml}

    <div class="line"></div>

    <div class="totals">
      <div class="trow"><span>Subtotal</span><span>${money(sale.subtotal)}</span></div>
      <div class="trow"><span>Discount</span><span>${money(sale.discountTotal)}</span></div>
      <div class="trow"><span>Tax</span><span>${money(sale.taxTotal)}</span></div>
      <div class="trow bold"><span>TOTAL</span><span>${money(sale.total)}</span></div>
    </div>

    <div class="line"></div>

    <div class="center small">Thank you for your purchase!</div>
    <img class="qr" src="${qrDataUrl}" alt="QR" />
  </div>

  <script>
    // What this does: auto open print dialog if you add ?autoprint=1
    if (new URLSearchParams(window.location.search).get("autoprint") === "1") {
      window.print();
    }
  </script>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(html);
  } catch (err) {
    return handleError(res, err, { status: 500, asText: true });
  }
};

