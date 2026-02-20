// What this does: manages motorbike promotions/imported sales data
const { createWorkbook } = require("../utils/safeExcel");
const { Prisma } = require("@prisma/client");
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

function s(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function normalizeHeader(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function parseBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const v = String(value || "").trim().toLowerCase();
  if (!v) return null;
  if (["yes", "y", "true", "1", "ok", "delivered"].includes(v)) return true;
  if (["no", "n", "false", "0"].includes(v)) return false;
  return null;
}

function excelDateToJs(num) {
  if (typeof num !== "number") return null;
  const utcDays = Math.floor(num - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return excelDateToJs(value);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function readCellText(cell) {
  if (!cell) return null;
  const text = String(cell.text || "").trim();
  if (text && !/e[\+\-]/i.test(text)) return text;
  return s(cell.value);
}

function normalizePhone(value) {
  const raw = s(value);
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || raw;
}

const HEADER_ALIASES = {
  countingNumber: [
    "countingnumber",
    "countnumber",
    "count",
    "no",
    "number",
    "countingno",
    "sno",
    "snocount",
  ],
  date: ["date", "soldate", "saleDate", "deliverydate"],
  customerName: ["names", "name", "customer", "customername", "client"],
  chassisNumber: ["chassisnumber", "chasisnumber", "chassis", "chassisno"],
  plateNumber: [
    "platenumber",
    "plate",
    "plateno",
    "platecode",
    "regno",
    "regnumber",
    "reg",
    "regnoplatenumber",
  ],
  model: ["model", "modelname"],
  phoneNumber: ["phonenumber", "phone", "tel", "telephone", "mobile"],
  delivered: ["deliverstatus", "delivered", "delivery", "deliver"],
  stubPaid: ["stubpayed", "stubpaid", "subpaid", "paidstub", "stub"],
  branchName: ["branch", "branchname", "branchlocation"],
};

function buildHeaderIndex(headerRow) {
  const indexByHeader = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = normalizeHeader(cell.value);
    if (key) indexByHeader[key] = colNumber;
  });

  const fieldIndex = {};
  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    for (const alias of aliases) {
      const idx = indexByHeader[normalizeHeader(alias)];
      if (idx) {
        fieldIndex[field] = idx;
        break;
      }
    }
  });

  return fieldIndex;
}

function ensurePromotionModel(res) {
  if (prisma.motorbikePromotion) return true;
  res.status(500).json({
    message:
      "Motorbike promotions model is not ready. Run prisma migrate dev and prisma generate.",
  });
  return false;
}

exports.listPromotions = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const clauses = [];

    const q = s(req.query.q);
    if (q) {
      const like = `%${q}%`;
      clauses.push(
        Prisma.sql`("countingNumber" ILIKE ${like} OR "customerName" ILIKE ${like} OR "chassisNumber" ILIKE ${like} OR "plateNumber" ILIKE ${like} OR "model" ILIKE ${like} OR "phoneNumber" ILIKE ${like} OR "branchName" ILIKE ${like})`
      );
    }

    if (req.query.delivered != null) {
      const v = String(req.query.delivered).trim().toLowerCase();
      if (v === "true") clauses.push(Prisma.sql`"delivered" = true`);
      if (v === "false") clauses.push(Prisma.sql`"delivered" = false`);
    }

    if (req.query.stubPaid != null) {
      const v = String(req.query.stubPaid).trim().toLowerCase();
      if (v === "true") clauses.push(Prisma.sql`"stubPaid" = true`);
      if (v === "false") clauses.push(Prisma.sql`"stubPaid" = false`);
    }

    if (req.query.branchName) {
      const branchLike = `%${String(req.query.branchName).trim()}%`;
      clauses.push(Prisma.sql`"branchName" ILIKE ${branchLike}`);
    }

    if (req.query.from || req.query.to) {
      const from = req.query.from ? new Date(`${String(req.query.from).trim()}T00:00:00.000Z`) : null;
      const to = req.query.to ? new Date(`${String(req.query.to).trim()}T23:59:59.999Z`) : null;
      if (from && Number.isNaN(from.getTime())) {
        return res.status(400).json({ message: "from must be YYYY-MM-DD" });
      }
      if (to && Number.isNaN(to.getTime())) {
        return res.status(400).json({ message: "to must be YYYY-MM-DD" });
      }
      if (from) clauses.push(Prisma.sql`"date" >= ${from}`);
      if (to) clauses.push(Prisma.sql`"date" <= ${to}`);
    }

    const whereSql =
      clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}` : Prisma.empty;

    const countRows = await prisma.$queryRaw(
      Prisma.sql`SELECT COUNT(*)::int AS count FROM "MotorbikePromotion" ${whereSql}`
    );
    const total = Number(countRows?.[0]?.count || 0);

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT *
        FROM "MotorbikePromotion"
        ${whereSql}
        ORDER BY
          CASE WHEN "countingNumber" ~ '^[0-9]+$' THEN "countingNumber"::int ELSE NULL END ASC NULLS LAST,
          "createdAt" ASC
        OFFSET ${skip}
        LIMIT ${limit}
      `
    );

    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      rows,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;
    const chassisNumber = s(req.body.chassisNumber);
    if (!chassisNumber) {
      return res.status(400).json({ message: "chassisNumber is required" });
    }

    const payload = {
      countingNumber: s(req.body.countingNumber),
      date: req.body.date ? new Date(String(req.body.date)) : null,
      customerName: s(req.body.customerName),
      chassisNumber,
      plateNumber: s(req.body.plateNumber),
      model: s(req.body.model),
      phoneNumber: normalizePhone(req.body.phoneNumber),
      delivered: Boolean(req.body.delivered),
      stubPaid: Boolean(req.body.stubPaid),
      branchName: s(req.body.branchName) || "muhima",
    };

    if (payload.date && Number.isNaN(payload.date.getTime())) {
      return res.status(400).json({ message: "date must be valid" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const data = { ...payload };
      if (!data.countingNumber) {
        const counter = await tx.counter.upsert({
          where: { id: "MOTORBIKE_PROMO" },
          update: { value: { increment: 1 } },
          create: { id: "MOTORBIKE_PROMO", value: 1 },
        });
        data.countingNumber = String(counter.value);
      }

      const saved = await tx.motorbikePromotion.create({ data });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "MOTORBIKE_PROMO_CREATE",
          details: `Created motorbike promotion chassis=${saved.chassisNumber}`,
        },
      });

      return saved;
    });

    return res.status(201).json(created);
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;
    const id = String(req.params.id).trim();
    const data = {};

    if (req.body.countingNumber != null) data.countingNumber = s(req.body.countingNumber);
    if (req.body.date != null) {
      const d = req.body.date ? new Date(String(req.body.date)) : null;
      if (d && Number.isNaN(d.getTime())) return res.status(400).json({ message: "date must be valid" });
      data.date = d;
    }
    if (req.body.customerName != null) data.customerName = s(req.body.customerName);
    if (req.body.chassisNumber != null) data.chassisNumber = s(req.body.chassisNumber);
    if (req.body.plateNumber != null) data.plateNumber = s(req.body.plateNumber);
    if (req.body.model != null) data.model = s(req.body.model);
    if (req.body.phoneNumber != null) data.phoneNumber = normalizePhone(req.body.phoneNumber);
    if (req.body.delivered != null) data.delivered = Boolean(req.body.delivered);
    if (req.body.stubPaid != null) data.stubPaid = Boolean(req.body.stubPaid);
    if (req.body.branchName != null) data.branchName = s(req.body.branchName);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const updated = await prisma.motorbikePromotion.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "MOTORBIKE_PROMO_UPDATE",
        details: `Updated motorbike promotion id=${id}`,
      },
    });

    return res.json(updated);
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;
    const id = String(req.params.id).trim();
    const removed = await prisma.motorbikePromotion.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "MOTORBIKE_PROMO_DELETE",
        details: `Deleted motorbike promotion id=${id} chassis=${removed.chassisNumber}`,
      },
    });

    return res.json({ message: "Promotion deleted", promotion: removed });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

exports.importPromotions = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;
    const fileBase64 = s(req.body.fileBase64);
    if (!fileBase64) {
      return res.status(400).json({ message: "fileBase64 is required" });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    const workbook = await createWorkbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return res.status(400).json({ message: "No worksheet found in Excel file" });
    }

    const headerRow = worksheet.getRow(1);
    const fieldIndex = buildHeaderIndex(headerRow);

    if (!fieldIndex.chassisNumber) {
      return res.status(400).json({ message: "chassisNumber column is required in the sheet" });
    }

    const rows = [];
    let skipped = 0;
    const hasDelivered = Boolean(fieldIndex.delivered);
    const hasStubPaid = Boolean(fieldIndex.stubPaid);
    const hasBranch = Boolean(fieldIndex.branchName);
    const hasPhone = Boolean(fieldIndex.phoneNumber);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const chassisValue = fieldIndex.chassisNumber
        ? s(row.getCell(fieldIndex.chassisNumber).value)
        : null;
      if (!chassisValue) {
        skipped += 1;
        return;
      }

      let phoneNumber = fieldIndex.phoneNumber
        ? normalizePhone(readCellText(row.getCell(fieldIndex.phoneNumber)))
        : null;

      if (!phoneNumber) {
        row.eachCell((cell, colNumber) => {
          if (colNumber === fieldIndex.countingNumber) return;
          if (colNumber === fieldIndex.date) return;
          if (colNumber === fieldIndex.chassisNumber) return;
          if (colNumber === fieldIndex.plateNumber) return;
          if (colNumber === fieldIndex.model) return;
          if (colNumber === fieldIndex.delivered) return;
          if (colNumber === fieldIndex.stubPaid) return;
          if (colNumber === fieldIndex.branchName) return;
          const candidate = normalizePhone(readCellText(cell));
          if (!candidate) return;
          if (candidate.length >= 8 && candidate.length <= 12) {
            phoneNumber = candidate;
          }
        });
      }

      const record = {
        countingNumber: fieldIndex.countingNumber
          ? readCellText(row.getCell(fieldIndex.countingNumber))
          : null,
        date: fieldIndex.date ? parseDate(row.getCell(fieldIndex.date).value) : null,
        customerName: fieldIndex.customerName
          ? readCellText(row.getCell(fieldIndex.customerName))
          : null,
        chassisNumber: chassisValue,
        plateNumber: fieldIndex.plateNumber
          ? readCellText(row.getCell(fieldIndex.plateNumber))
          : null,
        model: fieldIndex.model ? readCellText(row.getCell(fieldIndex.model)) : null,
        phoneNumber,
        delivered: fieldIndex.delivered
          ? Boolean(parseBool(row.getCell(fieldIndex.delivered).value))
          : false,
        stubPaid: fieldIndex.stubPaid
          ? Boolean(parseBool(row.getCell(fieldIndex.stubPaid).value))
          : false,
        branchName: fieldIndex.branchName
          ? readCellText(row.getCell(fieldIndex.branchName))
          : null,
      };

      if (!record.countingNumber) {
        record.countingNumber = String(rows.length + 1);
      }

      if (!record.branchName) {
        record.branchName = "muhima";
      }

      rows.push(record);
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: "No valid rows found to import" });
    }

    const result = await prisma.motorbikePromotion.createMany({
      data: rows,
      skipDuplicates: true,
    });

    let updated = 0;
    if (hasPhone || hasDelivered || hasStubPaid || hasBranch) {
      for (const record of rows) {
        const updateData = {};
        if (hasPhone && record.phoneNumber) updateData.phoneNumber = record.phoneNumber;
        if (hasDelivered) updateData.delivered = record.delivered;
        if (hasStubPaid) updateData.stubPaid = record.stubPaid;
        if (hasBranch) updateData.branchName = record.branchName || "muhima";

        if (Object.keys(updateData).length === 0) continue;
        const res = await prisma.motorbikePromotion.updateMany({
          where: { chassisNumber: record.chassisNumber },
          data: updateData,
        });
        updated += res.count;
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "MOTORBIKE_PROMO_IMPORT",
      details: `Imported motorbike promotions count=${result.count} updated=${updated} skipped=${skipped}`,
    },
  });

    return res.json({
      message: "Import completed",
      inserted: result.count,
      updated,
      skipped,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// What this does: exports promotions report as Excel for branch sales reporting
exports.exportPromotions = async (req, res) => {
  try {
    if (!ensurePromotionModel(res)) return;

    const where = {};
    const q = s(req.query.q);
    if (q) {
      where.OR = [
        { countingNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { chassisNumber: { contains: q, mode: "insensitive" } },
        { plateNumber: { contains: q, mode: "insensitive" } },
        { model: { contains: q, mode: "insensitive" } },
        { phoneNumber: { contains: q, mode: "insensitive" } },
        { branchName: { contains: q, mode: "insensitive" } },
      ];
    }

    if (req.query.delivered != null) {
      const v = String(req.query.delivered).trim().toLowerCase();
      if (v === "true") where.delivered = true;
      if (v === "false") where.delivered = false;
    }

    if (req.query.stubPaid != null) {
      const v = String(req.query.stubPaid).trim().toLowerCase();
      if (v === "true") where.stubPaid = true;
      if (v === "false") where.stubPaid = false;
    }

    if (req.query.branchName) {
      where.branchName = { contains: String(req.query.branchName).trim(), mode: "insensitive" };
    }

    if (req.query.from || req.query.to) {
      const from = req.query.from ? new Date(`${String(req.query.from).trim()}T00:00:00.000Z`) : null;
      const to = req.query.to ? new Date(`${String(req.query.to).trim()}T23:59:59.999Z`) : null;
      if (from && Number.isNaN(from.getTime())) {
        return res.status(400).json({ message: "from must be YYYY-MM-DD" });
      }
      if (to && Number.isNaN(to.getTime())) {
        return res.status(400).json({ message: "to must be YYYY-MM-DD" });
      }
      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      };
    }

    const rows = await prisma.motorbikePromotion.findMany({ where });
    rows.sort((a, b) => {
      const aNum = Number(a.countingNumber);
      const bNum = Number(b.countingNumber);
      const aValid = !Number.isNaN(aNum);
      const bValid = !Number.isNaN(bNum);
      if (aValid && bValid) return aNum - bNum;
      if (aValid) return -1;
      if (bValid) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const workbook = await createWorkbook();
    const sheet = workbook.addWorksheet("Motorbike Sales");

    sheet.columns = [
      { header: "S.NO", key: "countingNumber", width: 10 },
      { header: "DATE", key: "date", width: 14 },
      { header: "NAME", key: "customerName", width: 26 },
      { header: "CHASIS NUMBER", key: "chassisNumber", width: 22 },
      { header: "REG NO", key: "plateNumber", width: 14 },
      { header: "MODEL", key: "model", width: 16 },
      { header: "PHONE NUMBER", key: "phoneNumber", width: 16 },
      { header: "DELIVERED", key: "delivered", width: 12 },
      { header: "STUB PAID", key: "stubPaid", width: 12 },
      { header: "BRANCH", key: "branchName", width: 16 },
    ];

    rows.forEach((row, idx) => {
      const date = row.date ? new Date(row.date).toISOString().slice(0, 10) : "";
      sheet.addRow({
        countingNumber: row.countingNumber || String(idx + 1),
        date,
        customerName: row.customerName || "",
        chassisNumber: row.chassisNumber || "",
        plateNumber: row.plateNumber || "",
        model: row.model || "",
        phoneNumber: row.phoneNumber || "",
        delivered: row.delivered ? "Yes" : "No",
        stubPaid: row.stubPaid ? "Yes" : "No",
        branchName: row.branchName || "",
      });
    });

    sheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=\"motorbike_sales_report.xlsx\""
    );
    return res.send(Buffer.from(buffer));
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};
