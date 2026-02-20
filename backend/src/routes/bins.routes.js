// What this does: defines shelf/bin routes (create/list)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const { createBin, listBins } = require("../controllers/bins.controller");

// Only Store Keeper / Manager / CEO can create bins
router.post("/", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO"), createBin);

// Any logged-in user can list bins (cashier can view shelf map)
router.get("/", auth, listBins);

module.exports = router;

