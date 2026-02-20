// What this does: defines authentication routes
const router = require("express").Router();
const { login } = require("../controllers/auth.controller");

router.post("/login", login);

module.exports = router;
