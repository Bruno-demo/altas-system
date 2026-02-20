// What this does: creates and lists storage bins (shelf codes like A1-01)
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

exports.createBin = async (req, res) => {
  try {
    const { code, description, locationId } = req.body;

    if (!code || !locationId) {
      return res.status(400).json({ message: "code and locationId are required" });
    }

    const location = await prisma.location.findUnique({ where: { id: locationId } });
    if (!location) return res.status(404).json({ message: "Location not found" });

    const bin = await prisma.storageBin.create({
      data: {
        code: String(code).trim().toUpperCase(), // keep codes consistent
        description: description ? String(description).trim() : null,
        locationId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: "CREATE_BIN",
        details: `Created bin ${bin.code} in ${location.name}`,
      },
    });

    return res.status(201).json(bin);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Bin code already exists" });
    }
    return handleError(res, err, { status: 500 });
  }
};

exports.listBins = async (req, res) => {
  try {
    const { locationId } = req.query;

    const bins = await prisma.storageBin.findMany({
      where: locationId ? { locationId } : {},
      include: { location: { select: { id: true, name: true } } },
      orderBy: [{ location: { name: "asc" } }, { code: "asc" }],
    });

    res.json(bins);
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

