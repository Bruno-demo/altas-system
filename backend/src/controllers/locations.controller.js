// What this does: returns all locations (e.g. Main Store, Shop Floor)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

exports.listLocations = async (req, res) => {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { name: "asc" },
    });

    res.json(locations);
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

// What this does: creates a new location by name
exports.createLocation = async (req, res) => {
  try {
    const name = req.body?.name ? String(req.body.name).trim() : "";
    if (!name) return res.status(400).json({ message: "name is required" });

    const location = await prisma.location.create({
      data: { name },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CREATE_LOCATION",
        details: `Created location ${location.name}`,
      },
    });

    return res.status(201).json(location);
  } catch (err) {
    return handleError(res, err, { status: 400 });
  }
};

