import { randomUUID } from "crypto";
import { pool } from "../config/db.config";
import { UserRecord } from "../types/user.types";
import { RowDataPacket } from "mysql2";

export const chatDao = {
  async isMember(chatId: string, userId: number): Promise<boolean> {
    const [rows] = await pool.execute(
      "SELECT 1 FROM chat_members WHERE chat_id = ? AND user_id = ? AND is_active = 1 LIMIT 1",
      [chatId, userId],
    );

    return (rows as RowDataPacket[]).length > 0;
  },

  async createIndividual(userA: number, userB: number): Promise<string> {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      const [existing] = await conn.execute<
        (RowDataPacket & { chat_id: string })[]
      >(
        `SELECT cm1.chat_id
         FROM chat_members cm1
         JOIN chat_members cm2 ON cm1.chat_id = cm2.chat_id
         JOIN chats c ON c.id = cm1.chat_id
         WHERE cm1.user_id = ?
           AND cm2.user_id = ?
           AND c.chat_type = 'individual'
           AND cm1.is_active = 1
           AND cm2.is_active = 1
         LIMIT 1 FOR UPDATE`,
        [userA, userB],
      );

      if (existing[0]) {
        await conn.commit();
        return existing[0].chat_id;
      }

      const chatId = `ch_${randomUUID().replace(/-/g, "")}`;

      await conn.execute(
        "INSERT INTO chats (id, chat_type, created_by) VALUES (?,'individual',?)",
        [chatId, userA],
      );

      await conn.execute(
        "INSERT INTO chat_members (chat_id, user_id) VALUES (?,?),(?,?)",
        [chatId, userA, chatId, userB],
      );

      await conn.commit();

      return chatId;
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  },

  async participants(chatId: string): Promise<UserRecord[]> {
    const [rows] = await pool.execute<(RowDataPacket & UserRecord)[]>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.profile_image,
         u.is_online,
         u.last_seen
       FROM users u
       JOIN chat_members m ON m.user_id = u.id
       WHERE m.chat_id = ?
         AND m.is_active = 1`,
      [chatId],
    );

    return rows;
  },

  async listForUser(userId: number): Promise<Array<Record<string, unknown>>> {
    const [rows] = await pool.execute<
      (RowDataPacket & Record<string, unknown>)[]
    >(
      `SELECT
         c.id AS chatId,
         c.chat_type AS chatType,
         c.updated_at AS updatedAt,
         u.id AS otherUserId,
         u.name AS otherUserName,
         u.profile_image AS profileImage,
         u.is_online AS isOnline,
         u.last_seen AS lastSeen
       FROM chats c
       JOIN chat_members mine
         ON mine.chat_id = c.id
         AND mine.user_id = ?
         AND mine.is_active = 1
       JOIN chat_members other
         ON other.chat_id = c.id
         AND other.user_id <> ?
         AND other.is_active = 1
       JOIN users u ON u.id = other.user_id
       ORDER BY c.updated_at DESC`,
      [userId, userId],
    );

    return rows;
  },

  async touch(chatId: string): Promise<void> {
    await pool.execute(
      "UPDATE chats SET updated_at = UTC_TIMESTAMP() WHERE id = ?",
      [chatId],
    );
  },

  async setPresence(userId: number, online: boolean): Promise<void> {
    await pool.execute(
      "UPDATE users SET is_online = ?, last_seen = IF(? = 0, UTC_TIMESTAMP(), last_seen) WHERE id = ?",
      [online ? 1 : 0, online ? 1 : 0, userId],
    );
  },
};
