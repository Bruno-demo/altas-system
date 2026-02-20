// What this does: returns print-ready invoice JSON + generates a PDF invoice (EBM-ready fields included)
const prisma = require("../prisma");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

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

function money(value) {
  return toNum(value).toFixed(2);
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

async function loadSaleOr403(req, saleId) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      cashier: { select: { id: true, fullName: true, role: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, partNumber: true } },
          location: { select: { id: true, name: true } },
          bin: { select: { id: true, code: true } },
        },
      },
    },
  });

  if (!sale) return { error: { code: 404, message: "Sale not found" } };

  // Cashier can only access their own invoice
  if (req.user.role === "CASHIER" && sale.cashierId !== req.user.id) {
    return { error: { code: 403, message: "Forbidden" } };
  }

  return { sale };
}

exports.getInvoiceJson = async (req, res) => {
  const { sale, error } = await loadSaleOr403(req, req.params.id);
  if (error) return res.status(error.code).json({ message: error.message });

  // Print-ready payload for frontend/thermal/A4
  return res.json({
    company: COMPANY,
    buyer: {
      type: sale.buyerType,
      tin: sale.buyerTin,
      name: sale.buyerName,
      phone: sale.buyerPhone,
    },
    invoice: {
      id: sale.id,
      invoiceNo: sale.invoiceNo,
      createdAt: sale.createdAt,
      cashier: sale.cashier.fullName,
      paymentMethod: sale.paymentMethod,
      totals: {
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        taxTotal: sale.taxTotal,
        total: sale.total,
      },
      qrPayload: buildInvoiceQrPayload(sale),
      items: sale.items.map((it) => ({
        name: it.product.name,
        sku: it.product.sku,
        partNumber: it.product.partNumber,
        qty: it.quantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        lineTotal: it.lineTotal,
        pickFrom: {
          location: it.location?.name || "-",
          binCode: it.bin?.code || "MOTORBIKE",
        },
      })),
      ebm: {
        status: sale.ebmStatus,
        signature: sale.ebmReceiptSignature,
        qrPayload: sale.ebmQrPayload,
      },
    },
  });
};

exports.getInvoicePdf = async (req, res) => {
  const { sale, error } = await loadSaleOr403(req, req.params.id);
  if (error) return res.status(error.code).json({ message: error.message });

  // What this does: choose format (a4 or 80mm) using query param: ?format=80mm
  const format = (req.query.format || "a4").toLowerCase();
  const is80 = format === "80mm";

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${sale.invoiceNo}.pdf"`);

  const doc = new PDFDocument({
    size: is80 ? [226.77, 800] : "A4", // 80mm approx 226.77 points width
    margin: is80 ? 16 : 30,
  });

  doc.pipe(res);
  if (is80) doc.lineGap(2);

  const company = COMPANY;
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;

  if (is80) {
    const center = { align: "center", width: contentWidth };
    doc.font("Helvetica-Bold")
      .fontSize(14)
      .text(company.name, left, doc.y, center);
    doc.font("Helvetica")
      .fontSize(8.5)
      .text(`TIN: ${company.tin}`, left, doc.y, center)
      .text(`Tel: ${company.phone}`, left, doc.y, center)
      .text(company.address, left, doc.y, center);
    doc.moveDown(0.2);
    doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold")
      .fontSize(11)
      .text("INVOICE", left, doc.y, center);
    doc.font("Helvetica")
      .fontSize(8.5)
      .text(`No: ${sale.invoiceNo}`, left, doc.y, center)
      .text(`Date: ${new Date(sale.createdAt).toLocaleString()}`, left, doc.y, center)
      .text(`Cashier: ${sale.cashier.fullName}`, left, doc.y, center)
      .text(`Payment: ${sale.paymentMethod}`, left, doc.y, center);
    doc.moveDown(0.2);
    doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
    doc.moveDown(0.4);
  } else {
    const startY = doc.y;
    doc.font("Helvetica-Bold")
      .fontSize(18)
      .text(company.name, left, startY);
    doc.font("Helvetica")
      .fontSize(9)
      .text(`TIN: ${company.tin}`, left, doc.y + 2);
    doc.text(`Tel: ${company.phone}`, left, doc.y + 2);
    doc.text(company.address, left, doc.y + 2);

    const leftBlockBottom = doc.y;
    doc.y = startY;
    doc.font("Helvetica-Bold")
      .fontSize(14)
      .text("INVOICE", left, startY, { align: "right", width: contentWidth });
    doc.font("Helvetica")
      .fontSize(9)
      .text(`Invoice No: ${sale.invoiceNo}`, left, doc.y, {
        align: "right",
        width: contentWidth,
      })
      .text(`Date: ${new Date(sale.createdAt).toLocaleString()}`, left, doc.y, {
        align: "right",
        width: contentWidth,
      })
      .text(`Payment: ${sale.paymentMethod}`, left, doc.y, {
        align: "right",
        width: contentWidth,
      })
      .text(`Cashier: ${sale.cashier.fullName}`, left, doc.y, {
        align: "right",
        width: contentWidth,
      });

    const rightBlockBottom = doc.y;
    doc.y = Math.max(leftBlockBottom, rightBlockBottom) + 10;
  }

  doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
  doc.moveDown(0.6);

  doc.font("Helvetica-Bold")
    .fontSize(is80 ? 10 : 11)
    .text(is80 ? "Customer" : "Bill To:");
  doc.font("Helvetica")
    .fontSize(9)
    .text(`Name: ${sale.buyerName || "Walk-in"}`);
  if (sale.buyerTin) doc.text(`TIN: ${sale.buyerTin}`);
  if (sale.buyerPhone) doc.text(`Phone: ${sale.buyerPhone}`);
  doc.moveDown(0.4);

  doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
  doc.moveDown(0.6);

  if (is80) {
    doc.font("Helvetica-Bold").fontSize(10).text("Items");
    doc.moveDown(0.2);
    doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
    doc.moveDown(0.3);
    sale.items.forEach((it, idx) => {
      const bin = it.bin?.code || "MOTORBIKE";
      const location = it.location?.name || "-";
      doc.font("Helvetica-Bold").fontSize(9).text(`${idx + 1}. ${it.product.name}`);
      doc.font("Helvetica").fontSize(8.5);
      const lineY = doc.y;
      const metaLeftWidth = Math.round(contentWidth * 0.65);
      const metaRightWidth = contentWidth - metaLeftWidth;
      const qtyLine = `Qty: ${it.quantity}  Unit: ${money(it.unitPrice)}`;
      doc.text(qtyLine, left, lineY, { width: metaLeftWidth });
      doc.text(money(it.lineTotal), left + metaLeftWidth, lineY, {
        width: metaRightWidth,
        align: "right",
      });
      const lineHeight = doc.heightOfString(qtyLine, { width: metaLeftWidth });
      doc.y = lineY + lineHeight;
      if (bin !== "MOTORBIKE") {
        doc.text(`Pick: ${location} / ${bin}`, left, doc.y, {
          width: contentWidth,
        });
      }
      doc.moveDown(0.4);
    });
  } else {
    const columns = [
      { label: "Item", width: contentWidth * 0.45, align: "left" },
      { label: "Qty", width: contentWidth * 0.1, align: "right" },
      { label: "Unit Price", width: contentWidth * 0.15, align: "right" },
      { label: "Discount", width: contentWidth * 0.1, align: "right" },
      { label: "Line Total", width: contentWidth * 0.2, align: "right" },
    ];

    const drawHeaderRow = (y) => {
      doc.save();
      doc.rect(left, y, contentWidth, 18).fill("#f2f4f7");
      doc.fillColor("#101828");
      doc.font("Helvetica-Bold").fontSize(9);
      let x = left;
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 4, {
          width: col.width - 8,
          align: col.align,
        });
        x += col.width;
      });
      doc.restore();
      doc.fillColor("#101828");
      return y + 22;
    };

    let y = drawHeaderRow(doc.y);
    doc.font("Helvetica").fontSize(9);

    for (const it of sale.items) {
      const itemSub = it.product.partNumber || it.product.sku || "";
      const itemText = itemSub
        ? `${it.product.name}\n${itemSub}`
        : it.product.name;
      const itemHeight = doc.heightOfString(itemText, {
        width: columns[0].width - 8,
      });
      const rowHeight = Math.max(itemHeight, doc.currentLineHeight()) + 6;

      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 160) {
        doc.addPage();
        y = drawHeaderRow(doc.page.margins.top);
        doc.font("Helvetica").fontSize(9);
      }

      let x = left;
      doc.text(itemText, x + 4, y + 3, {
        width: columns[0].width - 8,
      });
      x += columns[0].width;
      doc.text(String(it.quantity), x, y + 3, {
        width: columns[1].width - 8,
        align: "right",
      });
      x += columns[1].width;
      doc.text(money(it.unitPrice), x, y + 3, {
        width: columns[2].width - 8,
        align: "right",
      });
      x += columns[2].width;
      doc.text(money(it.discount), x, y + 3, {
        width: columns[3].width - 8,
        align: "right",
      });
      x += columns[3].width;
      doc.text(money(it.lineTotal), x, y + 3, {
        width: columns[4].width - 8,
        align: "right",
      });

      y += rowHeight;
    }

    doc.y = y + 6;
  }

  doc.moveDown(0.4);
  doc.moveTo(left, doc.y).lineTo(left + contentWidth, doc.y).stroke("#d0d5dd");
  doc.moveDown(0.6);

  const totalsX = is80 ? left : left + contentWidth - 220;
  const labelWidth = is80 ? Math.round(contentWidth * 0.6) : 110;
  const valueWidth = is80 ? contentWidth - labelWidth : 110;
  let totalsY = doc.y;
  const totalFont = is80 ? 9 : 10;
  doc.font("Helvetica").fontSize(totalFont);
  [
    ["Subtotal", money(sale.subtotal)],
    ["Discount", money(sale.discountTotal)],
    ["Tax", money(sale.taxTotal)],
  ].forEach(([label, value]) => {
    const rowY = totalsY;
    doc.text(label, totalsX, rowY, { width: labelWidth });
    doc.text(value, totalsX + labelWidth, rowY, {
      width: valueWidth,
      align: "right",
    });
    totalsY += doc.currentLineHeight() + 4;
  });

  doc.font("Helvetica-Bold").text("TOTAL", totalsX, totalsY + 2, {
    width: labelWidth,
  });
  doc.font("Helvetica-Bold").text(money(sale.total), totalsX + labelWidth, totalsY + 2, {
    width: valueWidth,
    align: "right",
  });

  doc.y = totalsY + (is80 ? 14 : 18);

  doc.font("Helvetica-Bold").fontSize(10).text("EBM");
  doc.font("Helvetica").fontSize(9).text(`Status: ${sale.ebmStatus}`);
  doc.text(`SDC ID: ${sale.ebmInvoiceNo || "PENDING"}`);
  doc.text(`Signature: ${sale.ebmReceiptSignature || "PENDING"}`);

  const qrText = buildInvoiceQrPayload(sale);
  const qrDataUrl = await QRCode.toDataURL(qrText);
  const base64 = qrDataUrl.split(",")[1];
  const qrBuffer = Buffer.from(base64, "base64");
  const qrSize = is80 ? 90 : 120;
  const qrX = left + (contentWidth - qrSize) / 2;
  const qrY = doc.y + 6;
  doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
  doc.y = qrY + qrSize + 8;
  doc.fontSize(9).text("Thank you for your purchase!", { align: "center" });

  doc.end();
};
