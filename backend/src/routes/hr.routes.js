// FILE: src/routes/hr.routes.js
// What this does: defines HR module routes (employees + attendance + salary advances + payroll) with role-based access
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
} = require("../controllers/hr.employee.controller");

const {
  markAttendance,
  getAttendanceByDate,
  getAttendanceRange,
  getAttendanceSummary,
} = require("../controllers/hr.attendance.controller");

const {
  createAdvance,
  listAdvances,
  cancelAdvance,
  advancesSummary,
} = require("../controllers/hr.advance.controller");

const {
  generatePayroll,
  listPayrollRuns,
  getPayrollRun,
  finalizePayroll,
  exportPayrollBankExcel,
} = require("../controllers/hr.payroll.controller");

// Employees (HR + CEO write; Manager read)
router.post("/employees", auth, allowRoles("HR", "CEO"), createEmployee);
router.get("/employees", auth, allowRoles("HR", "CEO", "MANAGER"), getEmployees);
router.get("/employees/:id", auth, allowRoles("HR", "CEO", "MANAGER"), getEmployeeById);
router.put("/employees/:id", auth, allowRoles("HR", "CEO"), updateEmployee);

// Attendance (HR + CEO write; Manager read)
router.post("/attendance/mark", auth, allowRoles("HR", "CEO"), markAttendance);
router.get("/attendance", auth, allowRoles("HR", "CEO", "MANAGER"), getAttendanceByDate);
router.get("/attendance/range", auth, allowRoles("HR", "CEO", "MANAGER"), getAttendanceRange);
router.get("/attendance/summary", auth, allowRoles("HR", "CEO", "MANAGER"), getAttendanceSummary);

// Salary Advances (HR + CEO write; Manager read)
router.post("/advances", auth, allowRoles("HR", "CEO"), createAdvance);
router.get("/advances", auth, allowRoles("HR", "CEO", "MANAGER"), listAdvances);
router.get("/advances/summary", auth, allowRoles("HR", "CEO", "MANAGER"), advancesSummary);
router.post("/advances/:id/cancel", auth, allowRoles("HR", "CEO"), cancelAdvance);

// Payroll (HR + CEO write; Manager read-only)
router.post("/payroll/generate", auth, allowRoles("HR", "CEO"), generatePayroll);
router.get("/payroll", auth, allowRoles("HR", "CEO", "MANAGER"), listPayrollRuns);
router.get("/payroll/:runId", auth, allowRoles("HR", "CEO", "MANAGER"), getPayrollRun);
router.post("/payroll/:runId/finalize", auth, allowRoles("HR", "CEO"), finalizePayroll);
router.get("/payroll/:runId/export/bank-excel", auth, allowRoles("HR", "CEO"), exportPayrollBankExcel);

module.exports = router;
