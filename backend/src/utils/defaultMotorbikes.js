// What this does: ensures default cashier motorbikes exist for POS "infinite" sales
const DEFAULT_CASHIER_MOTORBIKES = [
  { sku: "POS-SPIRO-M1", name: "SPIRO M1", brand: "SPIRO" },
  { sku: "POS-SPIRO-M2", name: "SPIRO M2", brand: "SPIRO" },
  { sku: "POS-SPIRO-M3", name: "SPIRO M3", brand: "SPIRO" },
  { sku: "POS-BAJAJ", name: "BAJAJ", brand: "BAJAJ" },
  { sku: "POS-DISCOVER", name: "DISCOVER", brand: "DISCOVER" },
];

async function ensureCashierMotorbikes(prisma) {
  const skus = DEFAULT_CASHIER_MOTORBIKES.map((item) => item.sku);
  const existing = await prisma.product.findMany({
    where: { sku: { in: skus } },
    select: { sku: true },
  });

  const existingSet = new Set(existing.map((row) => row.sku));
  const missing = DEFAULT_CASHIER_MOTORBIKES.filter(
    (item) => !existingSet.has(item.sku)
  );

  if (!missing.length) return { created: 0 };

  const data = missing.map((item) => ({
    sku: item.sku,
    name: item.name,
    brand: item.brand,
    category: "Motorbike",
    unit: "unit",
    costPrice: "0",
    sellPrice: "0",
    minStock: 0,
    isActive: true,
    partNumber: null,
    modelCompatibility: null,
    chassisNumber: null,
    modelYear: null,
    weightKg: null,
    color: null,
    branchName: null,
  }));

  const result = await prisma.product.createMany({
    data,
    skipDuplicates: true,
  });

  return { created: result.count || 0 };
}

module.exports = { ensureCashierMotorbikes, DEFAULT_CASHIER_MOTORBIKES };
