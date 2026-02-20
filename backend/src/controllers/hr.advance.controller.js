// FILE: src/controllers/hr.advance.controller.js
// What this does: handles Salary Advances (create/list/cancel/summary) with audit logs
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

// What this does: parses a strict YYYY-MM-DD into a safe Date (midnight UTC)
function parseISODateOnly(dateStr, fieldName = "date") {
  if (!dateStr) {
    const err = new Error(`${fieldName} is required (YYYY-MM-DD)`);
    err.status = 400;
    throw err;
  }
  const s = String(dateStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const err = new Error(`${fieldName} must be YYYY-MM-DD`);
    err.status = 400;
    throw err;
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`Invalid ${fieldName}`);
    err.status = 400;
    throw err;
  }
  return d;
}

// What this does: trims string or returns null
function s(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

// What this does: normalizes array of ids (trim, unique, drop empties)
function normalizeIdArray(value) {
  if (!Array.isArray(value)) return [];
  const ids = value.map((v) => s(v)).filter(Boolean);
  return Array.from(new Set(ids));
}

// What this does: converts to Decimal-friendly money string
function money(v, fieldName = "amount") {
  const n = Number(v);
  if (Number.isNaN(n) || n <= 0) {
    const err = new Error(`${fieldName} must be a number > 0`);
    err.status = 400;
    throw err;
  }
  return n.toFixed(2);
}

// ✅ POST /api/hr/advances
exports.createAdvance = async (req, res) => {
  try {
    const bulkIds = normalizeIdArray(req.body.employeeIds);
    const singleId = s(req.body.employeeId);
    const employeeIds = bulkIds.length ? bulkIds : singleId ? [singleId] : [];
    if (!employeeIds.length) {
      return res.status(400).json({ message: "employeeId or employeeIds is required" });
    }

    const amount = money(req.body.amount, "amount");

    let date;
    if (req.body.date) date = parseISODateOnly(req.body.date, "date");
    else date = new Date();

    const reason = s(req.body.reason);

    const created = await prisma.$transaction(async (tx) => {
      const employees = await tx.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, fullName: true, isActive: true },
      });

      const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));
      const missing = employeeIds.filter((id) => !employeeMap.has(id));
      if (missing.length) {
        const err = new Error("Employee not found");
        err.status = 404;
        throw err;
      }

      const inactive = employees.filter((emp) => !emp.isActive);
      if (inactive.length) {
        const err = new Error("Employee is not active");
        err.status = 400;
        throw err;
      }

      const advances = [];

      for (const id of employeeIds) {
        const emp = employeeMap.get(id);
        const adv = await tx.salaryAdvance.create({
          data: {
            employeeId: id,
            amount,
            date,
            reason,
            status: "APPROVED",
            createdById: req.user.id,
          },
          include: {
            employee: { select: { id: true, fullName: true, phone: true, position: true } },
            createdBy: { select: { id: true, fullName: true, role: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: "HR_CREATE_ADVANCE",
            details: `Advance APPROVED for ${emp.fullName} amount=${amount} date=${date.toISOString()}`,
          },
        });

        advances.push(adv);
      }

      return advances;
    });

    if (employeeIds.length === 1) {
      return res.status(201).json(created[0]);
    }
    return res.status(201).json({ count: created.length, advances: created });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/hr/advances
exports.listAdvances = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const where = {};

    if (req.query.employeeId) where.employeeId = String(req.query.employeeId).trim();

    if (req.query.status) {
      const st = String(req.query.status).trim().toUpperCase();
      if (!["APPROVED", "CANCELLED"].includes(st)) {
        return res.status(400).json({ message: "status must be APPROVED or CANCELLED" });
      }
      where.status = st;
    }

    if (req.query.from && req.query.to) {
      const from = parseISODateOnly(req.query.from, "from");
      const toEnd = new Date(`${String(req.query.to).trim()}T23:59:59.999Z`);
      where.date = { gte: from, lte: toEnd };
    }

    const [total, advances] = await prisma.$transaction([
      prisma.salaryAdvance.count({ where }),
      prisma.salaryAdvance.findMany({
        where,
        orderBy: { date: "desc" },
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, fullName: true, phone: true, position: true } },
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      }),
    ]);

    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      advances,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ POST /api/hr/advances/:id/cancel
exports.cancelAdvance = async (req, res) => {
  try {
    const id = String(req.params.id).trim();
    const reason = s(req.body.reason);

    const updated = await prisma.$transaction(async (tx) => {
      const adv = await tx.salaryAdvance.findUnique({
        where: { id },
        include: { employee: { select: { id: true, fullName: true } } },
      });

      if (!adv) throw Object.assign(new Error("Advance not found"), { status: 404 });

      if (adv.status === "CANCELLED") {
        const err = new Error("Advance already cancelled");
        err.status = 409;
        throw err;
      }

      const u = await tx.salaryAdvance.update({
        where: { id },
        data: { status: "CANCELLED", reason: reason || adv.reason },
        include: {
          employee: { select: { id: true, fullName: true, phone: true, position: true } },
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "HR_CANCEL_ADVANCE",
          details: `Advance CANCELLED for ${adv.employee.fullName} advanceId=${id}. ${
            reason ? "Reason: " + reason : ""
          }`,
        },
      });

      return u;
    });

    return res.json({ message: "Advance cancelled", advance: updated });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/hr/advances/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.advancesSummary = async (req, res) => {
  try {
    if (!req.query.from || !req.query.to) {
      return res.status(400).json({ message: "from and to are required (YYYY-MM-DD)" });
    }

    const from = parseISODateOnly(req.query.from, "from");
    const toEnd = new Date(`${String(req.query.to).trim()}T23:59:59.999Z`);

    const whereBase = { date: { gte: from, lte: toEnd } };

    const [approvedAgg, cancelledAgg, perEmployee] = await prisma.$transaction([
      prisma.salaryAdvance.aggregate({
        where: { ...whereBase, status: "APPROVED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.salaryAdvance.aggregate({
        where: { ...whereBase, status: "CANCELLED" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.salaryAdvance.groupBy({
        by: ["employeeId"],
        where: { ...whereBase, status: "APPROVED" },
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: "desc" } },
      }),
    ]);

    const employeeIds = perEmployee.map((x) => x.employeeId);
    const employees = employeeIds.length
      ? await prisma.employee.findMany({
          where: { id: { in: employeeIds } },
          select: { id: true, fullName: true, phone: true, position: true },
        })
      : [];

    const emap = new Map(employees.map((e) => [e.id, e]));

    return res.json({
      range: { from: req.query.from, to: req.query.to },
      totals: {
        approved: {
          count: approvedAgg._count._all,
          amount: Number(Number(approvedAgg._sum.amount || 0).toFixed(2)),
        },
        cancelled: {
          count: cancelledAgg._count._all,
          amount: Number(Number(cancelledAgg._sum.amount || 0).toFixed(2)),
        },
      },
      perEmployee: perEmployee.map((x) => ({
        employee: emap.get(x.employeeId) || { id: x.employeeId },
        count: x._count._all,
        amount: Number(Number(x._sum.amount || 0).toFixed(2)),
      })),
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

