import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "relay_chat",
  waitForConnections: true,
  connectionLimit: 12,
  queueLimit: 0,
  timezone: "Z",
  charset: "utf8mb4",
});

export type DbRow = RowDataPacket;
export type DbResult = ResultSetHeader;
