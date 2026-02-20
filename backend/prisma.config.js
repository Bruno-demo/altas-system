const path = require("path");
const { defineConfig } = require("prisma/config");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
  // Ensure local project .env wins over machine/user env vars (e.g. stale DATABASE_URL)
  override: true,
});

module.exports = defineConfig({
  schema: "src/prisma/schema.prisma",
});
