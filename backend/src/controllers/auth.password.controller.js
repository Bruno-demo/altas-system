// What this does: lets a logged-in user change their own password and clears mustChangePassword
const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const { handleError } = require("../utils/errors");

function s(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

exports.changeMyPassword = async (req, res) => {
  try {
    const oldPassword = s(req.body.oldPassword);
    const newPassword = s(req.body.newPassword);

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "oldPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "newPassword must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Old password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: req.user.id },
        data: {
          password: hashed,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          userId: req.user.id,
          action: "CHANGE_PASSWORD",
          details: "User changed own password",
        },
      });
    });

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

