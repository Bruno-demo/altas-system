// What this does: exposes location endpoints (read-only for now)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const { listLocations, createLocation } = require("../controllers/locations.controller");

// Any logged-in user can fetch locations (cashier will need this later)
router.get("/", auth, listLocations);

// Only Store Keeper / Manager / CEO can create locations
router.post("/", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO"), createLocation);

module.exports = router;
