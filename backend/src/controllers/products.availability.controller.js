// What this does: returns availability, total qty, top bin suggestion and full pick list for a single product
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

exports.getProductAvailability = async (req, res) => {
  try {
    const productId = req.params.id;
    const { locationId, preferLocationId } = req.query;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        sku: true,
        partNumber: true,
        name: true,
        unit: true,
        brand: true,
        category: true,
        modelCompatibility: true,
        minStock: true,
        isActive: true,
      },
    });

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }

    const rows = await prisma.inventory.findMany({
      where: {
        productId,
        ...(locationId ? { locationId } : {}),
      },
      include: {
        location: { select: { id: true, name: true } },
        bin: { select: { id: true, code: true, description: true } },
      },
    });

    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

    const preferredLocation = preferLocationId ? String(preferLocationId) : null;

    const pickFrom = rows
      .filter((r) => r.quantity > 0)
      .map((r) => ({
        locationId: r.location.id,
        locationName: r.location.name,
        binId: r.bin ? r.bin.id : null,
        binCode: r.bin ? r.bin.code : null,
        binDescription: r.bin ? r.bin.description : null,
        quantity: r.quantity,
      }))
      // preferred location first, then highest quantity
      .sort((a, b) => {
        const aPref = preferredLocation && a.locationId === preferredLocation ? 1 : 0;
        const bPref = preferredLocation && b.locationId === preferredLocation ? 1 : 0;
        if (aPref !== bPref) return bPref - aPref;
        return b.quantity - a.quantity;
      });

    const topBinSuggestion = pickFrom.length > 0 ? pickFrom[0] : null;

    return res.json({
      product,
      available: totalQuantity > 0,
      totalQuantity,
      topBinSuggestion,
      pickFrom,
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

