// What this does: CEO dashboard routes (overview, cashflow, alerts, stock lifecycle)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  overview,
  cashflow,
  alerts,
  stockLifecycle,
} = require("../controllers/ceo.controller");

// CEO only (you can add MANAGER read later if you want)
router.get("/overview", auth, allowRoles("CEO"), overview);
router.get("/cashflow", auth, allowRoles("CEO"), cashflow);
router.get("/alerts", auth, allowRoles("CEO"), alerts);
router.get("/stock-lifecycle", auth, allowRoles("CEO"), stockLifecycle);

module.exports = router;
