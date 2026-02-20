// What this does: defines product routes (create, list)
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");
const { createProduct, listProducts, updateProduct } = require("../controllers/products.controller");
// What this does: product search for cashier (availability + shelf codes)
const { searchProducts } = require("../controllers/products.search.controller");
const { getProductAvailability } = require("../controllers/products.availability.controller");




router.get("/search", auth, searchProducts);
// What this does: returns availability + bin locations for one product (cashier "details" view)
router.get("/:id/availability", auth, getProductAvailability);


// Only Store Keeper / Manager / CEO / Salesperson can manage products
router.post("/", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO", "SALESPERSON"), createProduct);
router.put("/:id", auth, allowRoles("STORE_KEEPER", "MANAGER", "CEO", "SALESPERSON"), updateProduct);

// Anyone logged-in can view product list (cashier will need this later)
router.get("/", auth, listProducts);

module.exports = router;
