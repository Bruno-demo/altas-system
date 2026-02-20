// What this does: defines stock routes (in, out, damage, inventory view)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");


// What this does: adds transaction history + low stock endpoints
const {
  stockIn,
  stockOut,
  stockDamage,
  getInventory,
  getTransactions,
  getLowStock,
} = require("../controllers/stock.controller");


// Add these GET routes:
router.get("/transactions", auth, getTransactions);
router.get("/low-stock", auth, getLowStock);
// Store Keeper / Manager / CEO can do stock operations
router.post("/in", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO"), stockIn);
router.post("/out", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO"), stockOut);
router.post("/damage", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO"), stockDamage);

// Anyone logged in can view inventory (cashier may need it later)
router.get("/inventory", auth, getInventory);

module.exports = router;
