// What this does: defines expense endpoints (create/list/summary/export/edit/soft-delete)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  createExpense,
  listExpenses,
  expensesSummary,
  exportExpensesExcel,
  updateExpense,
  softDeleteExpense,
} = require("../controllers/expenses.controller");

// Write: CEO + MANAGER (HR read-only)
router.post("/", auth, allowRoles("CEO", "MANAGER"), createExpense);

// Read: CEO + MANAGER + HR
router.get("/", auth, allowRoles("CEO", "MANAGER", "HR"), listExpenses);
router.get("/summary", auth, allowRoles("CEO", "MANAGER", "HR"), expensesSummary);

// ✅ Export
router.get("/export/excel", auth, allowRoles("CEO", "MANAGER", "HR"), exportExpensesExcel);

// ✅ Edit
router.put("/:id", auth, allowRoles("CEO", "MANAGER"), updateExpense);

// ✅ Soft delete
router.delete("/:id", auth, allowRoles("CEO", "MANAGER"), softDeleteExpense);

module.exports = router;
