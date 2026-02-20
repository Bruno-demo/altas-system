// What this does: admin (CEO/Manager) user management routes
const router = require("express").Router();

const auth = require("../middleware/auth");
const allowRoles = require("../middleware/roles");

const {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  disableUser,
  enableUser,
  resetUserPassword,
} = require("../controllers/admin.users.controller");
const { getErrorLogs } = require("../controllers/admin.system.controller");

// CEO + MANAGER for full control
router.post("/users", auth, allowRoles("CEO", "MANAGER"), createUser);
router.get("/users", auth, allowRoles("CEO", "MANAGER"), listUsers);
router.get("/users/:id", auth, allowRoles("CEO", "MANAGER"), getUserById);
router.put("/users/:id", auth, allowRoles("CEO", "MANAGER"), updateUser);
router.post("/users/:id/disable", auth, allowRoles("CEO", "MANAGER"), disableUser);
router.post("/users/:id/enable", auth, allowRoles("CEO", "MANAGER"), enableUser);
router.post("/users/:id/reset-password", auth, allowRoles("CEO", "MANAGER"), resetUserPassword);
router.get("/system/error-logs", auth, allowRoles("CEO", "MANAGER"), getErrorLogs);

module.exports = router;
