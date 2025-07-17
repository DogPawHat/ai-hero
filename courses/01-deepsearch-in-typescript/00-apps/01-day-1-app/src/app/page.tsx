import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { auth } from "~/server/auth/index.ts";
import { ChatPage } from "./chat.tsx";
import { AuthButton } from "../components/auth-button.tsx";
import { getChats, getChat } from "~/server/db/chat-helpers";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: chatIdFromUrl } = await searchParams;
  const session = await auth();
  const userName = session?.user?.name ?? "Guest";
  const isAuthenticated = !!session?.user;
  const userId = session?.user?.id;

  // Generate stable chatId - use URL param if provided, otherwise generate new
  const chatId = chatIdFromUrl ?? crypto.randomUUID();
  const isNewChat = !chatIdFromUrl;

  // Fetch all chats for the sidebar
  const chats = userId && isAuthenticated ? await getChats({ userId }) : [];

  const activeChat =
    userId && chatIdFromUrl ? await getChat({ userId, chatId }) : null;

  const initialMessages =
    activeChat?.messages.map((msg) => ({
      id: msg.id,
      role: msg.role as "user" | "assistant",
      parts: msg.parts,
      content: "",
    })) || [];

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="flex w-64 flex-col border-r border-gray-700 bg-gray-900">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">Your Chats</h2>
            {isAuthenticated && (
              <Link
                href="/"
                className="flex size-8 items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                title="New Chat"
              >
                <PlusIcon className="size-5" />
              </Link>
            )}
          </div>
        </div>
        <div className="scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 -mt-1 flex-1 space-y-2 overflow-y-auto px-4 pt-1">
          {isAuthenticated && chats.length > 0 ? (
            chats.map((chat) => (
              <div key={chat.id} className="flex items-center gap-2">
                <Link
                  href={`/?id=${chat.id}`}
                  className={`flex-1 rounded-lg p-3 text-left text-sm text-gray-300 focus:ring-2 focus:ring-blue-400 focus:outline-none ${
                    chat.id === chatId
                      ? "bg-gray-700"
                      : "hover:bg-gray-750 bg-gray-800"
                  }`}
                >
                  {chat.title}
                </Link>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              {isAuthenticated
                ? "No chats yet. Start a new conversation!"
                : "Sign in to start chatting"}
            </p>
          )}
        </div>
        <div className="p-4">
          <AuthButton
            isAuthenticated={isAuthenticated}
            userImage={session?.user?.image}
          />
        </div>
      </div>

      <ChatPage
        key={chatId}
        userName={userName}
        isAuthenticated={isAuthenticated}
        chatId={chatId}
        isNewChat={isNewChat}
        initialMessages={initialMessages}
      />
    </div>
  );
}
