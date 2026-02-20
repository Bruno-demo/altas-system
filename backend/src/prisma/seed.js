// What this does: seeds demo data across core modules for presentation
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

function countWorkingDaysMonSat(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    if (d.getUTCDay() !== 0) count += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

function utcDate(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, 8, 0, 0));
}

function toNum(v) {
  const n = Number(v || 0);
  return Number.isNaN(n) ? 0 : n;
}

async function main() {
  const password = "Altas@2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const userSeeds = [
    { fullName: "Default CEO", email: "ceo@altas.local", role: "CEO" },
    { fullName: "Default Manager", email: "manager@altas.local", role: "MANAGER" },
    { fullName: "Default HR", email: "hr@altas.local", role: "HR" },
    { fullName: "Default Cashier", email: "cashier@altas.local", role: "CASHIER" },
    { fullName: "Default Store Keeper", email: "store@altas.local", role: "STORE_KEEPER" },
    { fullName: "Default Salesperson", email: "sales@altas.local", role: "SALESPERSON" },
  ];

  const userByRole = {};
  for (const user of userSeeds) {
    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        password: passwordHash,
        isActive: true,
        mustChangePassword: true,
      },
      create: {
        fullName: user.fullName,
        email: user.email,
        password: passwordHash,
        role: user.role,
        isActive: true,
        mustChangePassword: true,
      },
    });
    userByRole[user.role] = saved;
  }

  const locationSeeds = ["Muhima", "Kacyiru"];
  const locationByName = {};
  for (const name of locationSeeds) {
    const loc = await prisma.location.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    locationByName[name] = loc;
  }

  const binSeeds = [
    "A1-01",
    "A1-02",
    "A1-03",
    "A2-01",
    "A2-02",
    "A2-03",
    "B1-01",
    "B1-02",
    "B1-03",
    "B2-01",
    "B2-02",
    "C1-01",
    "C1-02",
    "C1-03",
    "C2-01",
    "C2-02",
    "C2-03",
    "C2-04",
    "D1-01",
    "D1-02",
    "D1-03",
    "D2-01",
    "D2-02",
    "D2-03",
    "E1-01",
    "E1-02",
    "E1-03",
    "E2-01",
    "K1-01",
    "K1-02",
    "K2-01",
    "K2-02",
  ];

  await prisma.storageBin.createMany({
    data: binSeeds.map((code) => ({
      code,
      locationId: locationByName[code.startsWith("K") ? "Kacyiru" : "Muhima"].id,
    })),
    skipDuplicates: true,
  });

  const bins = await prisma.storageBin.findMany({
    where: { code: { in: binSeeds } },
    select: { id: true, code: true, locationId: true },
  });
  const binByCode = new Map(bins.map((b) => [b.code, b]));

  const spareParts = [
    { sku: "SP-0001", name: "Spark Plug NGK BPR6ES", category: "Electrical", brand: "NGK", compatibility: "Universal", unit: "pcs", costPrice: 2500, sellPrice: 4000, minStock: 10, qty: 40, binCode: "A1-01" },
    { sku: "SP-0002", name: "Air Filter Element", category: "Engine", brand: "Genuine", compatibility: "TVS HLX 125", unit: "pcs", costPrice: 1800, sellPrice: 3000, minStock: 10, qty: 35, binCode: "A1-02" },
    { sku: "SP-0003", name: "Oil Filter Screen", category: "Engine", brand: "Genuine", compatibility: "Bajaj Boxer BM150", unit: "pcs", costPrice: 1500, sellPrice: 2500, minStock: 8, qty: 20, binCode: "A1-03" },
    { sku: "SP-0004", name: "Engine Oil 20W-50 1L", category: "Consumables", brand: "Total", compatibility: "Universal", unit: "litre", costPrice: 6500, sellPrice: 9000, minStock: 15, qty: 60, binCode: "B1-01" },
    { sku: "SP-0005", name: "Front Brake Pads", category: "Brake", brand: "TRW", compatibility: "Boxer BM150", unit: "set", costPrice: 4500, sellPrice: 7000, minStock: 8, qty: 25, binCode: "B1-02" },
    { sku: "SP-0006", name: "Rear Brake Shoes", category: "Brake", brand: "Genuine", compatibility: "TVS HLX 125", unit: "set", costPrice: 5200, sellPrice: 8000, minStock: 6, qty: 18, binCode: "B1-03" },
    { sku: "SP-0007", name: "Chain 428H 116L", category: "Drive", brand: "DID", compatibility: "Universal", unit: "pcs", costPrice: 18000, sellPrice: 25000, minStock: 4, qty: 12, binCode: "C1-01" },
    { sku: "SP-0008", name: "Sprocket Front 14T", category: "Drive", brand: "Genuine", compatibility: "Bajaj Boxer BM150", unit: "pcs", costPrice: 5500, sellPrice: 8500, minStock: 6, qty: 22, binCode: "C1-02" },
    { sku: "SP-0009", name: "Sprocket Rear 42T", category: "Drive", brand: "Genuine", compatibility: "Bajaj Boxer BM150", unit: "pcs", costPrice: 9000, sellPrice: 13500, minStock: 5, qty: 15, binCode: "C1-03" },
    { sku: "SP-0010", name: "Clutch Cable", category: "Engine", brand: "TVS", compatibility: "TVS HLX 125", unit: "pcs", costPrice: 2500, sellPrice: 4500, minStock: 10, qty: 30, binCode: "A2-01" },
    { sku: "SP-0011", name: "Throttle Cable", category: "Engine", brand: "Genuine", compatibility: "Universal", unit: "pcs", costPrice: 2200, sellPrice: 4000, minStock: 10, qty: 28, binCode: "A2-02" },
    { sku: "SP-0012", name: "Front Inner Tube 2.75-17", category: "Consumables", brand: "CST", compatibility: "Universal", unit: "pcs", costPrice: 3000, sellPrice: 5000, minStock: 12, qty: 40, binCode: "C2-01" },
    { sku: "SP-0013", name: "Rear Inner Tube 3.00-17", category: "Consumables", brand: "CST", compatibility: "Universal", unit: "pcs", costPrice: 3500, sellPrice: 5500, minStock: 12, qty: 38, binCode: "C2-02" },
    { sku: "SP-0014", name: "Front Tyre 2.75-17", category: "Consumables", brand: "CST", compatibility: "Universal", unit: "pcs", costPrice: 18000, sellPrice: 26000, minStock: 3, qty: 10, binCode: "C2-03" },
    { sku: "SP-0015", name: "Rear Tyre 3.00-17", category: "Consumables", brand: "CST", compatibility: "Universal", unit: "pcs", costPrice: 22000, sellPrice: 31000, minStock: 3, qty: 8, binCode: "C2-04" },
    { sku: "SP-0016", name: "Battery 12V 5Ah", category: "Electrical", brand: "GS", compatibility: "Universal", unit: "pcs", costPrice: 18000, sellPrice: 25000, minStock: 4, qty: 14, binCode: "D1-01" },
    { sku: "SP-0017", name: "Headlight Bulb 12V 35/35W", category: "Electrical", brand: "Philips", compatibility: "Universal", unit: "pcs", costPrice: 2000, sellPrice: 3500, minStock: 15, qty: 50, binCode: "D1-02" },
    { sku: "SP-0018", name: "Indicator Bulb 12V 10W", category: "Electrical", brand: "Osram", compatibility: "Universal", unit: "pcs", costPrice: 600, sellPrice: 1200, minStock: 25, qty: 100, binCode: "D1-03" },
    { sku: "SP-0019", name: "Front Fork Oil 500ml", category: "Suspension", brand: "Generic", compatibility: "Universal", unit: "bottle", costPrice: 4500, sellPrice: 7000, minStock: 6, qty: 20, binCode: "D2-01" },
    { sku: "SP-0020", name: "Front Shock Seal Kit", category: "Suspension", brand: "Genuine", compatibility: "TVS HLX 125", unit: "set", costPrice: 6500, sellPrice: 9500, minStock: 4, qty: 12, binCode: "D2-02" },
    { sku: "SP-0021", name: "Rear Shock Absorber", category: "Suspension", brand: "Genuine", compatibility: "Bajaj Boxer BM150", unit: "pcs", costPrice: 28000, sellPrice: 38000, minStock: 2, qty: 6, binCode: "D2-03" },
    { sku: "SP-0022", name: "Side Mirror", category: "Body", brand: "Generic", compatibility: "Universal", unit: "pcs", costPrice: 2500, sellPrice: 4500, minStock: 12, qty: 45, binCode: "E1-01" },
    { sku: "SP-0023", name: "Front Mudguard", category: "Body", brand: "Genuine", compatibility: "TVS HLX 125", unit: "pcs", costPrice: 12000, sellPrice: 17000, minStock: 2, qty: 7, binCode: "E1-02" },
    { sku: "SP-0024", name: "Brake Fluid DOT4 250ml", category: "Consumables", brand: "Bosch", compatibility: "Universal", unit: "bottle", costPrice: 3500, sellPrice: 5500, minStock: 10, qty: 30, binCode: "E1-03" },
    { sku: "SP-0025", name: "Wheel Bearing 6202", category: "Drive", brand: "SKF", compatibility: "Universal", unit: "pcs", costPrice: 2500, sellPrice: 4000, minStock: 20, qty: 60, binCode: "E2-01" },
  ];

  const motorbikes = [
    { chassisNumber: "SPIRO-M1-0001", manufacturer: "SPIRO", model: "M1", modelYear: 2025, weightKg: 85, color: "Blue", branchName: "Muhima", costPrice: 1850000, sellPrice: 2150000 },
    { chassisNumber: "SPIRO-M2-0002", manufacturer: "SPIRO", model: "M2", modelYear: 2025, weightKg: 88, color: "Red", branchName: "Muhima", costPrice: 1950000, sellPrice: 2250000 },
    { chassisNumber: "SPIRO-M3-0003", manufacturer: "SPIRO", model: "M3", modelYear: 2026, weightKg: 92, color: "Black", branchName: "Muhima", costPrice: 2050000, sellPrice: 2400000 },
    { chassisNumber: "BAJAJ-BM150-0004", manufacturer: "BAJAJ", model: "Boxer BM150", modelYear: 2024, weightKg: 115, color: "Black", branchName: "Kacyiru", costPrice: 1150000, sellPrice: 1450000 },
    { chassisNumber: "DISCOVER-125-0005", manufacturer: "DISCOVER", model: "Discover 125", modelYear: 2024, weightKg: 112, color: "Grey", branchName: "Kacyiru", costPrice: 1250000, sellPrice: 1550000 },
    { chassisNumber: "TVS-HLX-0006", manufacturer: "TVS", model: "HLX 125", modelYear: 2025, weightKg: 110, color: "Blue", branchName: "Muhima", costPrice: 1200000, sellPrice: 1500000 },
  ];

  for (const part of spareParts) {
    await prisma.product.upsert({
      where: { sku: part.sku },
      update: {
        name: part.name,
        unit: part.unit,
        costPrice: part.costPrice,
        sellPrice: part.sellPrice,
        minStock: part.minStock,
        brand: part.brand,
        category: part.category,
        modelCompatibility: part.compatibility,
      },
      create: {
        sku: part.sku,
        name: part.name,
        unit: part.unit,
        costPrice: part.costPrice,
        sellPrice: part.sellPrice,
        minStock: part.minStock,
        brand: part.brand,
        category: part.category,
        modelCompatibility: part.compatibility,
      },
    });
  }

  for (const bike of motorbikes) {
    await prisma.product.upsert({
      where: { sku: bike.chassisNumber },
      update: {
        name: bike.model,
        brand: bike.manufacturer,
        category: "Motorbike",
        chassisNumber: bike.chassisNumber,
        modelYear: bike.modelYear,
        weightKg: bike.weightKg,
        color: bike.color,
        branchName: bike.branchName,
        unit: "unit",
        costPrice: bike.costPrice,
        sellPrice: bike.sellPrice,
        minStock: 0,
      },
      create: {
        sku: bike.chassisNumber,
        name: bike.model,
        brand: bike.manufacturer,
        category: "Motorbike",
        chassisNumber: bike.chassisNumber,
        modelYear: bike.modelYear,
        weightKg: bike.weightKg,
        color: bike.color,
        branchName: bike.branchName,
        unit: "unit",
        costPrice: bike.costPrice,
        sellPrice: bike.sellPrice,
        minStock: 0,
      },
    });
  }

  const products = await prisma.product.findMany({
    where: { sku: { in: spareParts.map((p) => p.sku) } },
    select: { id: true, sku: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  for (const part of spareParts) {
    const bin = binByCode.get(part.binCode);
    const product = productBySku.get(part.sku);
    if (!bin || !product) continue;
    await prisma.inventory.upsert({
      where: {
        productId_locationId_binId: {
          productId: product.id,
          locationId: bin.locationId,
          binId: bin.id,
        },
      },
      update: { quantity: part.qty },
      create: {
        productId: product.id,
        locationId: bin.locationId,
        binId: bin.id,
        quantity: part.qty,
      },
    });
  }

  await prisma.stockTransaction.createMany({
    data: [
      {
        type: "IN",
        productId: productBySku.get("SP-0001").id,
        locationId: binByCode.get("A1-01").locationId,
        quantity: 20,
        unitCost: 2500,
        reason: "Opening stock",
        createdBy: userByRole.STORE_KEEPER.id,
      },
      {
        type: "IN",
        productId: productBySku.get("SP-0004").id,
        locationId: binByCode.get("B1-01").locationId,
        quantity: 10,
        unitCost: 6500,
        reason: "Opening stock",
        createdBy: userByRole.STORE_KEEPER.id,
      },
    ],
    skipDuplicates: true,
  });

  const employees = await Promise.all(
    [
      { employeeCode: "EMP-001", fullName: "Masengesho Bruno", phone: "0788257904", position: "Compliance Officer", baseSalary: 250000, bankName: "BK", bankAccount: "0011223344" },
      { employeeCode: "EMP-002", fullName: "Uwase Marie", phone: "0781122334", position: "Accountant", baseSalary: 300000, bankName: "BK", bankAccount: "0099887766" },
      { employeeCode: "EMP-003", fullName: "Niyonzima Eric", phone: "0782233445", position: "Store Assistant", baseSalary: 180000, bankName: "Equity", bankAccount: "1111222233" },
      { employeeCode: "EMP-004", fullName: "Mukamana Alice", phone: "0784455667", position: "HR Officer", baseSalary: 280000, bankName: "Access", bankAccount: "4444555566" },
      { employeeCode: "EMP-005", fullName: "Habimana Claude", phone: "0785566778", position: "Sales Agent", baseSalary: 220000, bankName: "BK", bankAccount: "7777888899" },
    ].map((emp) =>
      prisma.employee.upsert({
        where: { employeeCode: emp.employeeCode },
        update: {
          fullName: emp.fullName,
          phone: emp.phone,
          position: emp.position,
          baseSalary: emp.baseSalary,
          bankName: emp.bankName,
          bankAccount: emp.bankAccount,
          isActive: true,
        },
        create: {
          employeeCode: emp.employeeCode,
          fullName: emp.fullName,
          phone: emp.phone,
          position: emp.position,
          baseSalary: emp.baseSalary,
          bankName: emp.bankName,
          bankAccount: emp.bankAccount,
          isActive: true,
        },
      })
    )
  );

  const employeeByCode = new Map(employees.map((e) => [e.employeeCode, e]));

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const workingDays = countWorkingDaysMonSat(year, month);

  const attendanceRows = [];
  for (const emp of employees) {
    for (let day = 1; day <= 5; day += 1) {
      attendanceRows.push({
        employeeId: emp.id,
        date: utcDate(year, month, day),
        status: "PRESENT",
        createdById: userByRole.HR.id,
        isLate: day === 3,
        lateMinutes: day === 3 ? 15 : 0,
      });
    }
  }

  await prisma.attendance.createMany({
    data: attendanceRows,
    skipDuplicates: true,
  });

  await prisma.salaryAdvance.createMany({
    data: [
      {
        employeeId: employeeByCode.get("EMP-001").id,
        amount: 40000,
        date: utcDate(year, month, 4),
        reason: "Medical",
        status: "APPROVED",
        createdById: userByRole.HR.id,
      },
      {
        employeeId: employeeByCode.get("EMP-002").id,
        amount: 60000,
        date: utcDate(year, month, 5),
        reason: "School fees",
        status: "APPROVED",
        createdById: userByRole.HR.id,
      },
    ],
    skipDuplicates: true,
  });

  const run = await prisma.payrollRun.upsert({
    where: { year_month: { year, month } },
    update: { status: "DRAFT", generatedById: userByRole.HR.id },
    create: {
      year,
      month,
      status: "DRAFT",
      generatedById: userByRole.HR.id,
      totalNet: 0,
    },
  });

  await prisma.payrollItem.deleteMany({ where: { payrollRunId: run.id } });

  const presentCounts = new Map();
  for (const row of attendanceRows) {
    presentCounts.set(row.employeeId, (presentCounts.get(row.employeeId) || 0) + 1);
  }

  const lateCounts = new Map();
  for (const row of attendanceRows) {
    if (row.isLate) {
      lateCounts.set(row.employeeId, (lateCounts.get(row.employeeId) || 0) + 1);
    }
  }

  const advanceRows = await prisma.salaryAdvance.findMany({
    where: { status: "APPROVED", date: { gte: utcDate(year, month, 1) } },
  });
  const advanceTotals = new Map();
  for (const row of advanceRows) {
    advanceTotals.set(
      row.employeeId,
      toNum(advanceTotals.get(row.employeeId)) + toNum(row.amount)
    );
  }

  let totalNet = 0;
  for (const emp of employees) {
    const baseSalary = toNum(emp.baseSalary);
    const daysPresent = presentCounts.get(emp.id) || 0;
    const grossPay = workingDays ? (baseSalary * daysPresent) / workingDays : 0;
    const lateCount = lateCounts.get(emp.id) || 0;
    const dailyRate = workingDays ? baseSalary / workingDays : 0;
    const lateDeduction = Math.floor(lateCount / 3) * dailyRate;
    const advanceDeduction = advanceTotals.get(emp.id) || 0;
    const netPay = Math.max(
      grossPay - advanceDeduction - lateDeduction,
      0
    );
    totalNet += netPay;

    await prisma.payrollItem.create({
      data: {
        payrollRunId: run.id,
        employeeId: emp.id,
        baseSalary,
        daysPresent,
        workingDays,
        grossPay,
        lateCount,
        lateDeduction,
        advanceDeduction,
        otherDeductions: 0,
        netPay,
      },
    });
  }

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { totalNet },
  });

  await prisma.expense.createMany({
    data: [
      {
        date: utcDate(year, month, 2),
        amount: 150000,
        category: "RENT",
        paymentMethod: "BANK",
        vendor: "Main Landlord",
        description: "Monthly rent",
        createdById: userByRole.MANAGER.id,
      },
      {
        date: utcDate(year, month, 3),
        amount: 75000,
        category: "UTILITIES",
        paymentMethod: "CASH",
        vendor: "Utility Co",
        description: "Electricity",
        createdById: userByRole.MANAGER.id,
      },
      {
        date: utcDate(year, month, 4),
        amount: 120000,
        category: "STOCK_PURCHASE",
        paymentMethod: "MOMO",
        vendor: "AutoSupply Kigali",
        description: "Stock top-up",
        createdById: userByRole.STORE_KEEPER.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.motorbikePromotion.createMany({
    data: [
      {
        countingNumber: "1",
        date: utcDate(year, month, 2),
        customerName: "Renzaho Narcisse",
        chassisNumber: "SPIRO-M1-0001",
        plateNumber: "RK682A",
        model: "M1",
        phoneNumber: "788257904",
        delivered: true,
        stubPaid: true,
        branchName: "Muhima",
      },
      {
        countingNumber: "2",
        date: utcDate(year, month, 3),
        customerName: "Uwimana Grace",
        chassisNumber: "BAJAJ-BM150-0004",
        plateNumber: "RK711B",
        model: "Boxer BM150",
        phoneNumber: "0782233445",
        delivered: false,
        stubPaid: false,
        branchName: "Kacyiru",
      },
    ],
    skipDuplicates: true,
  });

  await prisma.salesSdcRow.createMany({
    data: [
      {
        sdcId: "SDC010161026/1",
        buyerTin: "103095519",
        buyerName: "SEBACUZI PASCAL",
        saleDate: utcDate(year, month, 5),
        receiptType: "Refund after Sale",
        itemName: "EKON M1 Electric Motorcycle",
        quantity: -1,
        unitPrice: -1175000,
        taxableSupplyPrice: -1175000,
        vat: 0,
        summaryAmount: -1175000,
        uploadedById: userByRole.MANAGER.id,
      },
      {
        sdcId: "SDC010161026/2",
        buyerTin: "102233445",
        buyerName: "KARERA JEAN",
        saleDate: utcDate(year, month, 5),
        receiptType: "Normal Sale",
        itemName: "Spark Plug NGK BPR6ES",
        quantity: 2,
        unitPrice: 4000,
        taxableSupplyPrice: 8000,
        vat: 0,
        summaryAmount: 8000,
        uploadedById: userByRole.MANAGER.id,
      },
    ],
    skipDuplicates: true,
  });

  const cashierShift = await prisma.cashierShift.create({
    data: {
      cashierId: userByRole.CASHIER.id,
      status: "OPEN",
    },
  });

  const saleItems = [
    { sku: "SP-0001", qty: 2, unitPrice: 4000, binCode: "A1-01" },
    { sku: "SP-0004", qty: 1, unitPrice: 9000, binCode: "B1-01" },
  ];

  let subtotal = 0;
  const itemCreates = [];
  for (const item of saleItems) {
    const product = productBySku.get(item.sku);
    const bin = binByCode.get(item.binCode);
    if (!product || !bin) continue;
    const lineTotal = item.qty * item.unitPrice;
    subtotal += lineTotal;
    itemCreates.push({
      productId: product.id,
      locationId: bin.locationId,
      binId: bin.id,
      quantity: item.qty,
      unitPrice: item.unitPrice,
      discount: 0,
      lineTotal,
    });
  }

  if (itemCreates.length) {
    await prisma.sale.create({
      data: {
        invoiceNo: `ALT-${year}-000001`,
        subtotal,
        discountTotal: 0,
        taxTotal: 0,
        total: subtotal,
        paymentMethod: "CASH",
        note: "Demo sale",
        buyerType: "INDIVIDUAL",
        cashierId: userByRole.CASHIER.id,
        shiftId: cashierShift.id,
        items: { create: itemCreates },
      },
    });
  }

  console.log("Seed complete.");
  console.log(`Login demo users (password: ${password}):`);
  userSeeds.forEach((u) => console.log(`- ${u.email} (${u.role})`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => prisma.$disconnect());
