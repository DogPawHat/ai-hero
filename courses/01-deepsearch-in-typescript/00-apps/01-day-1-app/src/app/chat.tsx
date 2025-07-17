"use client";

import { ChatMessage } from "~/components/chat-message";
import { SignInModal } from "~/components/sign-in-modal";
import { useChat } from "@ai-sdk/react";
import type { Message } from "ai";
import { Square } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { isNewChatCreated } from "./utils/chat-utils";

interface ChatProps {
  userName: string;
  isAuthenticated: boolean;
  chatId: string | undefined;
  initialMessages: Array<Message>;
}

export const ChatPage = ({ userName, isAuthenticated, chatId, initialMessages = [] }: ChatProps) => {
  const [showSignInModal, setShowSignInModal] = useState(false);
  const router = useRouter();

  const { messages, input, handleInputChange, handleSubmit, isLoading, data } =
    useChat({
      body: {
        chatId,
      },
      initialMessages,
      onError: (error) => {
        // If we get a 401 error, show the sign-in modal
        if (
          error.message.includes("401") ||
          error.message.includes("Unauthorized")
        ) {
          setShowSignInModal(true);
        }
      },
    });

  // Handle redirect when new chat is created
  useEffect(() => {
    const lastDataItem = data?.[data.length - 1];
    
    if (lastDataItem && isNewChatCreated(lastDataItem)) {
      router.push(`?id=${lastDataItem.chatId}`);
    }
  }, [data, router]);

  console.log(messages);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div
          className="mx-auto w-full max-w-[65ch] flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500"
          role="log"
          aria-label="Chat messages"
        >
          {messages.map((message, index) => {
            return (
              <ChatMessage
                key={index}
                parts={message.parts}
                role={message.role}
                userName={userName}
              />
            );
          })}

          {!isAuthenticated && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="mb-4 text-gray-400">
                Welcome! Please sign in to start chatting.
              </p>
              <button
                onClick={() => setShowSignInModal(true)}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                Sign In
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700">
          <form onSubmit={handleSubmit} className="mx-auto max-w-[65ch] p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={
                  isAuthenticated
                    ? "Say something..."
                    : "Sign in to start chatting..."
                }
                autoFocus={isAuthenticated}
                aria-label="Chat input"
                className="flex-1 rounded border border-gray-700 bg-gray-800 p-2 text-gray-200 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={isLoading || !isAuthenticated}
              />
              <button
                type="button"
                onClick={
                  isAuthenticated
                    ? handleSubmit
                    : () => setShowSignInModal(true)
                }
                disabled={
                  isLoading || (!isAuthenticated && input.trim() === "")
                }
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:hover:bg-gray-700"
              >
                {isLoading ? (
                  <Square className="size-4 animate-spin" />
                ) : isAuthenticated ? (
                  "Send"
                ) : (
                  "Sign In"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
      />
    </>
  );
};
