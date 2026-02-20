// What this does: manages employees for HR module (CRUD with validation)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

// What this does: safely converts to string (or null)
function s(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

// What this does: converts number-like values to Decimal-friendly string
function toMoneyString(v) {
  if (v == null) return null;
  const n = Number(v);
  if (Number.isNaN(n) || n < 0) return null;
  return n.toFixed(2);
}

exports.createEmployee = async (req, res) => {
  try {
    const fullName = s(req.body.fullName);
    const nationalId = s(req.body.nationalId);
    const tin = s(req.body.tin);
    const phone = s(req.body.phone);
    const position = s(req.body.position);
    const bankName = s(req.body.bankName);
    const bankAccount = s(req.body.bankAccount);
    const baseSalary = toMoneyString(req.body.baseSalary);
    const employeeCode = s(req.body.employeeCode);
    const employmentType = req.body.employmentType ? String(req.body.employmentType).trim().toUpperCase() : "STAFF";
    const hireDate = req.body.hireDate ? new Date(String(req.body.hireDate)) : null;

    if (!employeeCode) return res.status(400).json({ message: "employeeCode is required (badge ID)" });
    if (!["STAFF", "TRAINEE"].includes(employmentType)) {
      return res.status(400).json({ message: "employmentType must be STAFF or TRAINEE" });
    }
    if (hireDate && Number.isNaN(hireDate.getTime())) {
      return res.status(400).json({ message: "hireDate must be a valid ISO date" });
    }


    if (!fullName) return res.status(400).json({ message: "fullName is required" });
    if (!baseSalary) return res.status(400).json({ message: "baseSalary is required and must be >= 0" });

    const emp = await prisma.employee.create({
      data: {
        employeeCode,
        fullName,
        nationalId,
        tin,
        phone,
        position,
        employmentType,
        hireDate,
        baseSalary,
        bankName,
        bankAccount,
      },
    });


    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "HR_CREATE_EMPLOYEE",
        details: `Created employee ${emp.fullName} (${emp.id})`,
      },
    });

    return res.status(201).json(emp);
  } catch (err) {
    return handleError(res, err, { status: 400 });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const q = s(req.query.q);
    const isActive = req.query.isActive != null ? String(req.query.isActive) === "true" : undefined;

    const where = {};
    if (typeof isActive === "boolean") where.isActive = isActive;
    if (q) {
      where.OR = [
        { employeeCode: { contains: q, mode: "insensitive" } },
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { nationalId: { contains: q, mode: "insensitive" } },
        { tin: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, employees] = await prisma.$transaction([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return res.json({
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      employees,
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const emp = await prisma.employee.findUnique({ where: { id: req.params.id } });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    return res.json(emp);
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const id = req.params.id;

    const data = {};
    if (req.body.fullName != null) data.fullName = s(req.body.fullName);
    if (req.body.nationalId != null) data.nationalId = s(req.body.nationalId);
    if (req.body.phone != null) data.phone = s(req.body.phone);
    if (req.body.position != null) data.position = s(req.body.position);
    if (req.body.bankName != null) data.bankName = s(req.body.bankName);
    if (req.body.bankAccount != null) data.bankAccount = s(req.body.bankAccount);
    if (req.body.employeeCode != null) data.employeeCode = s(req.body.employeeCode);
    if (req.body.tin != null) data.tin = s(req.body.tin);

    if (req.body.employmentType != null) {
      const t = String(req.body.employmentType).trim().toUpperCase();
      if (!["STAFF", "TRAINEE"].includes(t)) {
        return res.status(400).json({ message: "employmentType must be STAFF or TRAINEE" });
      }
      data.employmentType = t;
    }

    if (req.body.hireDate != null) {
      const d = req.body.hireDate ? new Date(String(req.body.hireDate)) : null;
      if (d && Number.isNaN(d.getTime())) return res.status(400).json({ message: "hireDate must be valid ISO date" });
      data.hireDate = d;
    }

    if (req.body.baseSalary != null) {
      const baseSalary = toMoneyString(req.body.baseSalary);
      if (!baseSalary) return res.status(400).json({ message: "baseSalary must be >= 0" });
      data.baseSalary = baseSalary;
    }

    if (req.body.isActive != null) data.isActive = String(req.body.isActive) === "true";

    const emp = await prisma.employee.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "HR_UPDATE_EMPLOYEE",
        details: `Updated employee ${emp.fullName} (${emp.id})`,
      },
    });

    return res.json(emp);
  } catch (err) {
    return handleError(res, err, { status: 400 });
  }
};

