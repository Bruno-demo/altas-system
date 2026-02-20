// What this does: handles login and returns a JWT token
const prisma = require("../prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || "").trim();

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  // What this does: blocks inactive users, sets lastLoginAt, and returns mustChangePassword flag
  // After you verify password is correct:
  if (!user.isActive) {
    return res.status(403).json({ message: "Account disabled. Contact admin." });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
  // Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  // Return mustChangePassword so frontend can redirect
  return res.json({
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
};
