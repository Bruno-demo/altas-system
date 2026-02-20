// What this does: provides branch-level summaries and detail views for motorbike sales
const prisma = require("../prisma");
const { handleError } = require("../utils/errors");

function s(v) {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

function toNum(value) {
  if (value && typeof value.toNumber === "function") return value.toNumber();
  const n = Number(value || 0);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeBranchLabel(value) {
  return value || "Unassigned";
}

function buildBranchFilter(branch) {
  const name = s(branch);
  if (!name) return { label: "Unassigned", filter: { branchName: null } };
  if (name.toLowerCase() === "unassigned") {
    return { label: "Unassigned", filter: { branchName: null } };
  }
  return {
    label: name,
    filter: { branchName: { equals: name, mode: "insensitive" } },
  };
}

exports.listBranches = async (req, res) => {
  try {
    const q = s(req.query.q)?.toLowerCase() || "";
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const [productGroups, promoGroups] = await prisma.$transaction([
      prisma.product.groupBy({
        by: ["branchName"],
        where: { category: "Motorbike", isActive: true },
        _count: { _all: true },
        _sum: { sellPrice: true },
      }),
      prisma.motorbikePromotion.groupBy({
        by: ["branchName"],
        _count: { _all: true },
        _max: { date: true },
      }),
    ]);

    const map = new Map();

    productGroups.forEach((row) => {
      const label = normalizeBranchLabel(row.branchName);
      map.set(label, {
        branchName: label,
        bikesCount: row._count?._all || 0,
        bikesValue: toNum(row._sum?.sellPrice || 0),
        soldCount: 0,
        lastSoldAt: null,
      });
    });

    promoGroups.forEach((row) => {
      const label = normalizeBranchLabel(row.branchName);
      const existing = map.get(label) || {
        branchName: label,
        bikesCount: 0,
        bikesValue: 0,
        soldCount: 0,
        lastSoldAt: null,
      };
      existing.soldCount = row._count?._all || 0;
      existing.lastSoldAt = row._max?.date || null;
      map.set(label, existing);
    });

    let branches = Array.from(map.values());
    if (q) {
      branches = branches.filter((row) =>
        row.branchName.toLowerCase().includes(q)
      );
    }

    branches.sort((a, b) => {
      if (b.soldCount !== a.soldCount) return b.soldCount - a.soldCount;
      if (b.bikesCount !== a.bikesCount) return b.bikesCount - a.bikesCount;
      return a.branchName.localeCompare(b.branchName);
    });

    const total = branches.length;
    const pages = Math.max(Math.ceil(total / limit), 1);
    const rows = branches.slice(skip, skip + limit);

    return res.json({
      meta: { total, page, limit, pages },
      rows,
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};

exports.getBranchDetail = async (req, res) => {
  try {
    const branchParam = s(req.query.branch);
    if (!branchParam) {
      return res.status(400).json({ message: "branch is required" });
    }

    const bikePage = Math.max(Number(req.query.bikePage) || 1, 1);
    const bikeLimit = Math.min(Number(req.query.bikeLimit) || 20, 100);
    const salePage = Math.max(Number(req.query.salePage) || 1, 1);
    const saleLimit = Math.min(Number(req.query.saleLimit) || 10, 50);
    const q = s(req.query.q);

    const { label, filter } = buildBranchFilter(branchParam);

    const bikeWhere = {
      category: "Motorbike",
      isActive: true,
      ...filter,
    };

    if (q) {
      bikeWhere.OR = [
        { sku: { contains: q, mode: "insensitive" } },
        { chassisNumber: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
        { color: { contains: q, mode: "insensitive" } },
      ];
    }

    const saleWhere = { ...filter };

    const [bikeTotal, bikes, saleTotal, sales, lastSold] =
      await prisma.$transaction([
        prisma.product.count({ where: bikeWhere }),
        prisma.product.findMany({
          where: bikeWhere,
          orderBy: { createdAt: "desc" },
          skip: (bikePage - 1) * bikeLimit,
          take: bikeLimit,
        }),
        prisma.motorbikePromotion.count({ where: saleWhere }),
        prisma.motorbikePromotion.findMany({
          where: saleWhere,
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          skip: (salePage - 1) * saleLimit,
          take: saleLimit,
        }),
        prisma.motorbikePromotion.aggregate({
          where: saleWhere,
          _max: { date: true },
        }),
      ]);

    return res.json({
      branch: {
        name: label,
        bikesCount: bikeTotal,
        soldCount: saleTotal,
        lastSoldAt: lastSold?._max?.date || null,
      },
      bikes: {
        meta: {
          total: bikeTotal,
          page: bikePage,
          limit: bikeLimit,
          pages: Math.max(Math.ceil(bikeTotal / bikeLimit), 1),
        },
        rows: bikes,
      },
      sales: {
        meta: {
          total: saleTotal,
          page: salePage,
          limit: saleLimit,
          pages: Math.max(Math.ceil(saleTotal / saleLimit), 1),
        },
        rows: sales,
      },
    });
  } catch (err) {
    return handleError(res, err, { status: 500 });
  }
};
