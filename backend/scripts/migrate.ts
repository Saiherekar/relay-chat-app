import "dotenv/config";
import { readFile } from "fs/promises";
import { pool } from "../config/db.config";

async function main() {
  const sql = await readFile("database/schema.sql", "utf8");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const statement of statements) await pool.query(statement);
  console.info("Database schema applied.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
