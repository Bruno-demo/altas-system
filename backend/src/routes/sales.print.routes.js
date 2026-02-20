// What this does: provides print-ready sale invoice and receipt HTML
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  getSalePrintJson,
  getSaleReceiptHtml,
} = require("../controllers/sales.print.controller");

// Cashier/Manager/CEO can print
router.get("/:id/print", auth, allowRoles("CASHIER", "MANAGER", "CEO"), getSalePrintJson);
router.get("/:id/receipt-html", auth, allowRoles("CASHIER", "MANAGER", "CEO"), getSaleReceiptHtml);

module.exports = router;
