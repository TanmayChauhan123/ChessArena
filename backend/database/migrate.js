import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import pool from "../src/config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsPath = path.join(__dirname, "migrations");

const files = (await fs.readdir(migrationsPath))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const filePath = path.join(migrationsPath, file);
  const sql = await fs.readFile(filePath, "utf8");

  await pool.query(sql);

  console.log(`Applied migration: ${file}`);
}

await pool.end();

console.log("All migrations completed successfully.");
