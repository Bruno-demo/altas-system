// What this does: creates a single Prisma client instance you can reuse everywhere
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
