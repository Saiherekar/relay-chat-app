import { pool } from "../config/db.config";
import { UserRecord } from "../types/user.types";

export const userDao = {
  async findByEmail(
    email: string,
  ): Promise<(UserRecord & { password_hash: string }) | null> {
    const [rows] = await pool.execute<
      (UserRecord & { password_hash: string })[]
    >(
      "SELECT id,name,email,profile_image,is_online,last_seen,password_hash FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    return rows[0] ?? null;
  },
  async findById(id: number): Promise<UserRecord | null> {
    const [rows] = await pool.execute<UserRecord[]>(
      "SELECT id,name,email,profile_image,is_online,last_seen FROM users WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ?? null;
  },
  async create(name: string, email: string, hash: string): Promise<number> {
    const [result] = await pool.execute(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)",
      [name, email, hash],
    );
    return (result as { insertId: number }).insertId;
  },
  async updateProfile(id: number, name: string): Promise<void> {
    await pool.execute("UPDATE users SET name = ? WHERE id = ?", [name, id]);
  },
  async setPresence(id: number, online: boolean): Promise<void> {
    await pool.execute(
      "UPDATE users SET is_online = ?, last_seen = IF(? = 0, UTC_TIMESTAMP(), last_seen) WHERE id = ?",
      [online ? 1 : 0, online ? 1 : 0, id],
    );
  },
};
