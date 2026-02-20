// What this does: provides EBM-entry data + saves EBM receipt signature/QR into Sale
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

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

  // Cashier can only access their own sale
  if (req.user.role === "CASHIER" && sale.cashierId !== req.user.id) {
    return { error: { code: 403, message: "Forbidden" } };
  }

  return { sale };
}

exports.getEbmInput = async (req, res) => {
  try {
    const { sale, error } = await loadSaleOr403(req, req.params.id);
    if (error) return res.status(error.code).json({ message: error.message });

    // What this does: returns a simplified view cashier can use to enter quickly into EBM 2.1 app
    return res.json({
      invoiceNo: sale.invoiceNo,
      createdAt: sale.createdAt,
      buyer: {
        type: sale.buyerType,
        tin: sale.buyerTin,
        name: sale.buyerName,
        phone: sale.buyerPhone,
      },
      totals: {
        subtotal: sale.subtotal,
        discountTotal: sale.discountTotal,
        taxTotal: sale.taxTotal,
        total: sale.total,
      },
      paymentMethod: sale.paymentMethod,
      items: sale.items.map((it) => ({
        name: it.product.name,
        partNumber: it.product.partNumber,
        sku: it.product.sku,
        qty: it.quantity,
        unitPrice: it.unitPrice,
        lineTotal: it.lineTotal,
        pickFrom: `${it.location.name} / ${it.bin.code}`,
      })),
      ebm: {
        status: sale.ebmStatus,
        receiptSignature: sale.ebmReceiptSignature,
      },
      note: sale.note,
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

exports.confirmEbm = async (req, res) => {
  try {
    const { ebmInvoiceNo, ebmReceiptSignature, ebmQrPayload, ebmIssuedAt } =
      req.body;

    if (!ebmInvoiceNo) {
      return res.status(400).json({ message: "ebmInvoiceNo is required" });
    }
    if (!ebmReceiptSignature) {
      return res.status(400).json({ message: "ebmReceiptSignature is required" });
    }

    const ebmInvoice = String(ebmInvoiceNo).trim();
    if (!ebmInvoice) {
      return res.status(400).json({ message: "ebmInvoiceNo is required" });
    }

    const { sale, error } = await loadSaleOr403(req, req.params.id);
    if (error) return res.status(error.code).json({ message: error.message });

    const existing = await prisma.sale.findFirst({
      where: { ebmInvoiceNo: ebmInvoice },
      select: { id: true },
    });
    if (existing && existing.id !== sale.id) {
      return res
        .status(409)
        .json({ message: "EBM invoice number already used." });
    }

    if (sale.ebmStatus === "SIGNED") {
      return res.status(409).json({ message: "EBM already confirmed for this sale" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saleRecord = await tx.sale.update({
        where: { id: sale.id },
        data: {
          ebmStatus: "SIGNED",
          ebmInvoiceNo: ebmInvoice,
          ebmReceiptSignature: String(ebmReceiptSignature).trim(),
          ebmQrPayload: ebmQrPayload ? String(ebmQrPayload).trim() : null,
          ebmIssuedAt: ebmIssuedAt ? new Date(ebmIssuedAt) : new Date(),
        },
      });

      const saleItems = await tx.saleItem.findMany({
        where: { saleId: saleRecord.id },
        include: { product: { select: { name: true } } },
      });

      const sdcIdValue = saleRecord.ebmInvoiceNo || saleRecord.invoiceNo;
      for (const item of saleItems) {
        const quantity = Number(item.quantity || 0);
        const unitPrice = Number(item.unitPrice || 0);
        const lineTotal = Number(item.lineTotal || quantity * unitPrice);
        const sdcRow = {
          sdcId: sdcIdValue,
          buyerTin: saleRecord.buyerTin,
          buyerName: saleRecord.buyerName,
          saleDate: saleRecord.createdAt,
          receiptType: "Sale",
          itemName: item.product?.name || item.productId,
          quantity,
          unitPrice,
          taxableSupplyPrice: lineTotal,
          vat: 0,
          summaryAmount: lineTotal,
          uploadedById: req.user.id,
        };
        const existingRow = await tx.salesSdcRow.findUnique({
          where: {
            sdcId_itemName: {
              sdcId: sdcRow.sdcId,
              itemName: sdcRow.itemName,
            },
          },
        });
        if (existingRow) {
          await tx.salesSdcRow.update({
            where: { id: existingRow.id },
            data: {
              ...sdcRow,
              updatedAt: new Date(),
            },
          });
        } else {
          await tx.salesSdcRow.create({
            data: sdcRow,
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "EBM_CONFIRM",
          details: `EBM confirmed for ${saleRecord.invoiceNo} ebmInvoiceNo=${ebmInvoice} signature=${String(
            ebmReceiptSignature
          ).trim()}`,
        },
      });

      return saleRecord;
    });

    return res.json(updated);
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

