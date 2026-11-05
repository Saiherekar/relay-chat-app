import { randomUUID } from "crypto";
import { firestore, firebaseAdmin } from "../config/firebase.config";
import { chatDl } from "../dl/chatDl";
import { ChatMessage, MessagePage } from "../types/chat.types";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MAX_MESSAGE_LENGTH,
} from "../utils/constants";
import { ApiError } from "../types/api.types";

const fail = (message: string, statusCode: number): ApiError =>
  Object.assign(new Error(message), { statusCode });

const messagesRef = (chatId: string) => {
  if (!firestore) {
    throw fail(
      "Messaging service is not configured. Add Firebase Admin credentials.",
      503,
    );
  }

  return firestore.collection("chats").doc(chatId).collection("messages");
};

export const chatBl = {
  async createChat(requesterId: number, userAId: number, userBId: number) {
    if (requesterId !== userAId && requesterId !== userBId) {
      throw fail("You must be a participant", 403);
    }

    if (userAId === userBId) {
      throw fail("A chat requires two different users", 400);
    }

    const id = await chatDl.createIndividual(userAId, userBId);

    return { chatId: id };
  },

  async sendMessage(
    senderId: number,
    chatId: string,
    text: string,
    clientId?: string,
  ): Promise<ChatMessage> {
    if (!(await chatDl.isMember(chatId, senderId))) {
      throw fail("You are not a member of this chat", 403);
    }

    const clean = text.trim();

    if (!clean || clean.length > MAX_MESSAGE_LENGTH) {
      throw fail(
        `Message must contain 1–${MAX_MESSAGE_LENGTH} characters`,
        400,
      );
    }

    const ref = messagesRef(chatId);

    // Prevent duplicate messages using clientId
    if (clientId) {
      const duplicate = await ref
        .where("senderId", "==", senderId)
        .where("clientId", "==", clientId)
        .limit(1)
        .get();

      const d = duplicate.docs[0];

      if (d) {
        return {
          id: d.id,
          chatId,
          senderId,
          text: String(d.get("text")),
          timestamp: (
            d.get("timestamp")?.toDate?.() ?? new Date()
          ).toISOString(),
          editedAt: null,
          deletedAt: null,
          clientId,
        };
      }
    }

    const doc = ref.doc(randomUUID());
    const now = new Date();

    await doc.create({
      senderId,
      text: clean,
      clientId: clientId ?? null,
      timestamp: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
      editedAt: null,
      deletedAt: null,
    });

    await chatDl.touch(chatId);

    return {
      id: doc.id,
      chatId,
      senderId,
      text: clean,
      timestamp: now.toISOString(),
      editedAt: null,
      deletedAt: null,
      clientId,
    };
  },

  async getMessages(
    userId: number,
    chatId: string,
    limit = DEFAULT_PAGE_SIZE,
    cursor?: string,
  ): Promise<MessagePage> {
    if (!(await chatDl.isMember(chatId, userId))) {
      throw fail("You are not a member of this chat", 403);
    }

    const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);

    let query = messagesRef(chatId)
      .orderBy("timestamp", "desc")
      .limit(safeLimit + 1);

    if (cursor) {
      const cursorDoc = await messagesRef(chatId).doc(cursor).get();

      if (!cursorDoc.exists) {
        throw fail("Invalid pagination cursor", 400);
      }

      query = query.startAfter(cursorDoc);
    }

    const snap = await query.get();

    const hasMore = snap.docs.length > safeLimit;
    const docs = snap.docs.slice(0, safeLimit);

    const messages = docs
      .map((d) => {
        const v = d.data();

        const timestamp = v.timestamp?.toDate?.() as Date | undefined;

        return {
          id: d.id,
          chatId,
          senderId: Number(v.senderId),
          text: String(v.text ?? ""),
          timestamp: (timestamp ?? new Date()).toISOString(),
          editedAt: v.editedAt?.toDate?.()?.toISOString() ?? null,
          deletedAt: v.deletedAt?.toDate?.()?.toISOString() ?? null,
        } satisfies ChatMessage;
      })
      .reverse();

    return {
      messages,
      hasMore,
      nextCursor: hasMore ? (docs[docs.length - 1]?.id ?? null) : null,
    };
  },

  async markRead(userId: number, chatId: string, messageId: string) {
    if (!(await chatDl.isMember(chatId, userId))) {
      throw fail("You are not a member of this chat", 403);
    }

    const ref = messagesRef(chatId).doc(messageId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw fail("Message not found", 404);
    }

    if (Number(doc.get("senderId")) === userId) {
      return {
        messageId,
        userId,
        readAt: new Date().toISOString(),
      };
    }

    const readAt = new Date();

    await firestore!
      .collection("chats")
      .doc(chatId)
      .collection("receipts")
      .doc(messageId)
      .collection("users")
      .doc(String(userId))
      .set(
        {
          readAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return {
      messageId,
      userId,
      readAt: readAt.toISOString(),
    };
  },

  async updateLastSeen(userId: number, chatId: string, messageId: string) {
    if (!(await chatDl.isMember(chatId, userId))) {
      throw fail("You are not a member of this chat", 403);
    }

    const ref = messagesRef(chatId).doc(messageId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw fail("Message not found", 404);
    }

    const lastSeenAt = new Date();

    await firestore!
      .collection("chats")
      .doc(chatId)
      .collection("members")
      .doc(String(userId))
      .set(
        {
          lastSeenMessageId: messageId,
          lastSeenAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return {
      messageId,
      userId,
      lastSeenAt: lastSeenAt.toISOString(),
    };
  },

  async listChats(userId: number) {
    const chats = await chatDl.listForUser(userId);

    return Promise.all(
      chats.map(async (c) => {
        const chatId = String(c.chatId);

        let latestMessage: ChatMessage | null = null;

        if (firestore) {
          const snap = await firestore
            .collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

          const d = snap.docs[0];

          if (d) {
            const v = d.data();

            latestMessage = {
              id: d.id,
              chatId,
              senderId: Number(v.senderId),
              text: String(v.text ?? ""),
              timestamp: (v.timestamp?.toDate?.() ?? new Date()).toISOString(),
              editedAt: null,
              deletedAt: null,
            };
          }
        }

        return {
          ...c,
          latestMessage,
          unreadCount: 0,
        };
      }),
    );
  },
};
