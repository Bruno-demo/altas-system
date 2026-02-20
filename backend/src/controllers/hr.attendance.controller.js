// FILE: src/controllers/hr.attendance.controller.js
// What this does: professional attendance marking & reading (bulk upsert, date-safe, lateness tracking, audit logs)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

// What this does: ensures we store date at midnight UTC to avoid timezone shifting issues
function parseISODateOnly(dateStr) {
  if (!dateStr) {
    const err = new Error("date is required (YYYY-MM-DD)");
    err.status = 400;
    throw err;
  }
  const s = String(dateStr).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const err = new Error("date must be YYYY-MM-DD");
    err.status = 400;
    throw err;
  }
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("Invalid date");
    err.status = 400;
    throw err;
  }
  return d;
}

// What this does: validates AttendanceStatus
function normalizeStatus(v) {
  const val = String(v || "").trim().toUpperCase();
  const allowed = ["PRESENT", "ABSENT", "LEAVE"];
  if (!allowed.includes(val)) {
    const err = new Error("status must be PRESENT | ABSENT | LEAVE");
    err.status = 400;
    throw err;
  }
  return val;
}

// What this does: trims note safely
function note(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

// ✅ POST /api/hr/attendance/mark
// Body: { date: "YYYY-MM-DD", records: [{ employeeId, status, note?, isLate?, lateMinutes?, checkInTime? }], fillAbsent?: boolean }
exports.markAttendance = async (req, res) => {
  try {
    const day = parseISODateOnly(req.body.date);
    const records = req.body.records;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "records must be a non-empty array" });
    }

    // Optional: if true, mark everyone NOT included as ABSENT (daily sheet behavior)
    const fillAbsent = req.body.fillAbsent === true;

    // Validate input + deduplicate employeeIds
    const prepared = [];
    const seen = new Set();

    for (const r of records) {
      const employeeId = r?.employeeId ? String(r.employeeId).trim() : "";
      if (!employeeId) return res.status(400).json({ message: "Each record requires employeeId" });
      if (seen.has(employeeId)) return res.status(400).json({ message: `Duplicate employeeId: ${employeeId}` });
      seen.add(employeeId);

      const status = normalizeStatus(r.status);

      // Lateness (only allowed if PRESENT)
      const isLate = r.isLate === true;
      const lateMinutes =
        r.lateMinutes != null && !Number.isNaN(Number(r.lateMinutes)) ? Math.max(Number(r.lateMinutes), 0) : 0;

      // Optional check-in time (ISO)
      const checkInTime = r.checkInTime ? new Date(String(r.checkInTime)) : null;
      if (checkInTime && Number.isNaN(checkInTime.getTime())) {
        return res.status(400).json({ message: "checkInTime must be a valid ISO datetime" });
      }

      prepared.push({
        employeeId,
        status,
        note: note(r.note),
        isLate: status === "PRESENT" ? isLate : false,
        lateMinutes: status === "PRESENT" ? lateMinutes : 0,
        checkInTime: status === "PRESENT" ? checkInTime : null,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Ensure employees exist and are active
      const employees = await tx.employee.findMany({
        where: { id: { in: prepared.map((p) => p.employeeId) } },
        select: { id: true, isActive: true, fullName: true },
      });

      const empMap = new Map(employees.map((e) => [e.id, e]));
      for (const p of prepared) {
        const e = empMap.get(p.employeeId);
        if (!e) throw Object.assign(new Error(`Employee not found: ${p.employeeId}`), { status: 404 });
        if (!e.isActive) throw Object.assign(new Error(`Employee is not active: ${e.fullName}`), { status: 400 });
      }

      // Upsert attendance rows (idempotent)
      const upserts = prepared.map((p) =>
        tx.attendance.upsert({
          where: { employeeId_date: { employeeId: p.employeeId, date: day } },
          update: {
            status: p.status,
            note: p.note,
            checkInTime: p.checkInTime,
            isLate: p.isLate,
            lateMinutes: p.lateMinutes,
            createdById: req.user.id,
          },
          create: {
            employeeId: p.employeeId,
            date: day,
            status: p.status,
            note: p.note,
            checkInTime: p.checkInTime,
            isLate: p.isLate,
            lateMinutes: p.lateMinutes,
            createdById: req.user.id,
          },
        })
      );

      const saved = await Promise.all(upserts);

      // If fillAbsent=true, mark others as ABSENT without overriding existing records
      let filledAbsent = 0;
      if (fillAbsent) {
        const allActive = await tx.employee.findMany({
          where: { isActive: true },
          select: { id: true },
        });

        const toMarkAbsent = allActive.map((e) => e.id).filter((id) => !seen.has(id));

        for (const empId of toMarkAbsent) {
          await tx.attendance.upsert({
            where: { employeeId_date: { employeeId: empId, date: day } },
            update: {}, // do not override if exists
            create: {
              employeeId: empId,
              date: day,
              status: "ABSENT",
              note: "Auto-filled absent",
              isLate: false,
              lateMinutes: 0,
              createdById: req.user.id,
            },
          });
          filledAbsent += 1;
        }
      }

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "HR_MARK_ATTENDANCE",
          details: `Marked attendance on ${req.body.date} records=${records.length} fillAbsent=${fillAbsent} filled=${filledAbsent}`,
        },
      });

      return { saved, filledAbsent };
    });

    return res.status(201).json({
      message: "Attendance saved",
      date: req.body.date,
      filledAbsent: result.filledAbsent,
      rows: result.saved,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/hr/attendance?date=YYYY-MM-DD&status=PRESENT&page=1&limit=50
exports.getAttendanceByDate = async (req, res) => {
  try {
    const day = parseISODateOnly(req.query.date);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const where = { date: day };

    if (req.query.status) where.status = normalizeStatus(req.query.status);
    if (req.query.employeeId) where.employeeId = String(req.query.employeeId).trim();

    const [total, rows] = await prisma.$transaction([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        orderBy: [{ status: "asc" }, { employee: { fullName: "asc" } }],
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
      date: req.query.date,
      rows,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/hr/attendance/range?from=YYYY-MM-DD&to=YYYY-MM-DD&employeeId=...
exports.getAttendanceRange = async (req, res) => {
  try {
    const from = parseISODateOnly(req.query.from);
    const to = parseISODateOnly(req.query.to);

    const where = { date: { gte: from, lte: to } };
    if (req.query.employeeId) where.employeeId = String(req.query.employeeId).trim();

    const rows = await prisma.attendance.findMany({
      where,
      orderBy: [{ date: "asc" }, { employee: { fullName: "asc" } }],
      include: { employee: { select: { id: true, fullName: true } } },
    });

    return res.json({
      range: { from: req.query.from, to: req.query.to },
      rows,
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

// ✅ GET /api/hr/attendance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getAttendanceSummary = async (req, res) => {
  try {
    const from = parseISODateOnly(req.query.from);
    const to = parseISODateOnly(req.query.to);

    const grouped = await prisma.attendance.groupBy({
      by: ["status"],
      where: { date: { gte: from, lte: to } },
      _count: { _all: true },
    });

    const perEmployee = await prisma.attendance.groupBy({
      by: ["employeeId", "status"],
      where: { date: { gte: from, lte: to } },
      _count: { _all: true },
    });

    const employeeIds = [...new Set(perEmployee.map((x) => x.employeeId))];

    const employees = await prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true, position: true, isActive: true },
    });

    const emap = new Map(employees.map((e) => [e.id, e]));

    const sumMap = new Map(); // employeeId -> { PRESENT, ABSENT, LEAVE }
    for (const r of perEmployee) {
      if (!sumMap.has(r.employeeId)) sumMap.set(r.employeeId, { PRESENT: 0, ABSENT: 0, LEAVE: 0 });
      sumMap.get(r.employeeId)[r.status] = r._count._all;
    }

    return res.json({
      range: { from: req.query.from, to: req.query.to },
      totals: grouped.map((g) => ({ status: g.status, count: g._count._all })),
      employees: employeeIds.map((id) => ({
        employee: emap.get(id) || { id },
        counts: sumMap.get(id) || { PRESENT: 0, ABSENT: 0, LEAVE: 0 },
      })),
    });
  } catch (err) {
    return handleError(res, err, { status: err.status || 500 });
  }
};

