// What this does: adds invoice list endpoints for cashier/manager/CEO
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  listSales,
  getSaleById,
} = require("../controllers/sales.list.controller");

// Invoice list
router.get("/", auth, allowRoles("SALESPERSON", "CASHIER", "MANAGER", "CEO"), listSales);

// Single sale summary (optional but useful)
router.get("/:id", auth, allowRoles("SALESPERSON", "CASHIER", "MANAGER", "CEO"), getSaleById);

module.exports = router;
