// What this does: adds authenticated change-password endpoint
const router = require("express").Router();

const auth = require("../middleware/auth");
const { changeMyPassword } = require("../controllers/auth.password.controller");

router.post("/change-password", auth, changeMyPassword);

module.exports = router;
