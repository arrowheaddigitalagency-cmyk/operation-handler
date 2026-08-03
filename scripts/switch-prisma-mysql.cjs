#!/usr/bin/env node
/**
 * Flip Prisma datasource provider to mysql (idempotent).
 * Run once before Hostinger migrate deploy. Local SQLite remains until you run this.
 */
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "packages", "db", "prisma", "schema.prisma");
let src = fs.readFileSync(schemaPath, "utf8");
if (/provider\s*=\s*"mysql"/.test(src)) {
  console.log("schema.prisma already set to mysql");
  process.exit(0);
}
if (!/provider\s*=\s*"sqlite"/.test(src)) {
  console.error("Could not find sqlite provider in schema.prisma");
  process.exit(1);
}
src = src.replace(/provider\s*=\s*"sqlite"/, 'provider = "mysql"');
fs.writeFileSync(schemaPath, src);
console.log("Updated packages/db/prisma/schema.prisma → provider = \"mysql\"");
console.log("Next: set DATABASE_URL to MySQL, then pnpm db:migrate:deploy");
