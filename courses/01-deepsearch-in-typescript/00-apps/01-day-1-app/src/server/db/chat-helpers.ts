import type { Message } from "ai";
import { db } from "./index";
import { chats, messages } from "./schema";
import { eq, and } from "drizzle-orm";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: Message[];
}): Promise<void> => {
  const { userId, chatId, title, messages: newMessages } = opts;

  await db.transaction(async (tx) => {
    // Check if chat exists
    const existingChat = await tx.query.chats.findFirst({
      where: eq(chats.id, chatId),
    });

    if (existingChat) {
      // Verify the chat belongs to the user
      if (existingChat.userId !== userId) {
        throw new Error("Chat not found");
      }
      
      // Chat exists and belongs to user, delete all existing messages
      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      // Chat doesn't exist, create new chat
      await tx.insert(chats).values({
        id: chatId,
        title,
        userId,
      });
    }

    // Insert new messages
    if (newMessages.length > 0) {
      const messageInserts = newMessages.map((message, index) => ({
        id: crypto.randomUUID(),
        chatId,
        order: index,
        content: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
        parts: message.parts,
        role: message.role,
      }));

      await tx.insert(messages).values(messageInserts as any);
    }

    // Update chat title and updated_at
    await tx
      .update(chats)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(eq(chats.id, chatId));
  });
};

export const getChat = async (opts: {
  userId: string;
  chatId: string;
}) => {
  const { userId, chatId } = opts;

  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      messages: {
        orderBy: (messages, { asc }) => [asc(messages.order)],
      },
    },
  });

  if (!chat) {
    return null;
  }

  return {
    id: chat.id,
    title: chat.title,
    userId: chat.userId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: chat.messages.map((message) => ({
      id: message.id,
      order: message.order,
      content: message.content,
      parts: message.parts,
      role: message.role,
      createdAt: message.createdAt,
    })),
  };
};

export const getChats = async (opts: {
  userId: string;
}) => {
  const { userId } = opts;

  const userChats = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });

  return userChats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    userId: chat.userId,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }));
};