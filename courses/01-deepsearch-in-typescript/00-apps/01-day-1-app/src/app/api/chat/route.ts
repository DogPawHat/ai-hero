import type { Message } from "ai";
import { createDataStreamResponse } from "ai";
import { appendResponseMessages } from "ai";
import { streamFromDeepSearch } from "~/deep-search";
import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/chat-helpers";
import { Langfuse } from "langfuse";
import { env } from "~/env";

export const maxDuration = 60;

// Initialize Langfuse client
const langfuse = new Langfuse({
  environment: env.NODE_ENV,
});

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId: string;
    isNewChat: boolean;
  };

  const { messages, chatId, isNewChat } = body;
  const userId = session.user.id;

  // Use the provided chatId directly since it's always a string now
  const currentChatId = chatId;

  // Create a trace with user and session data
  const trace = langfuse.trace({
    sessionId: currentChatId,
    name: "chat",
    userId: session.user.id,
  });

  // Create or update the chat with the current messages before streaming
  // This ensures the chat exists even if the stream fails or is cancelled
  const title =
    messages[messages.length - 1]?.content?.toString().slice(0, 50) ||
    "New Chat";
  
  // Create a span for the database transaction
  const dbSpan = trace.span({
    name: "upsert-chat-transaction",
    input: {
      userId,
      chatId: currentChatId,
      title,
      messageCount: messages.length,
      isNewChat: !messages.some(m => m.role === 'assistant'),
    },
  });

  try {
    await upsertChat({
      userId,
      chatId: currentChatId,
      title,
      messages,
    });
    
    dbSpan.end({
      output: {
        success: true,
        chatId: currentChatId,
        messageCount: messages.length,
      },
    });
  } catch (error) {
    dbSpan.end({
      output: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat (isNewChat is true), send the new chat ID to the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }

      const result = streamFromDeepSearch({
        messages,
        telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;

          // Merge the response messages with the existing messages
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Create a span for the final chat update
          const updatedTitle =
            updatedMessages[updatedMessages.length - 1]?.content
              ?.toString()
              .slice(0, 50) || title;
          
          const finalUpdateSpan = trace.span({
            name: "update-chat-final",
            input: {
              userId,
              chatId: currentChatId,
              messageCount: updatedMessages.length,
              titleLength: updatedTitle.length,
            },
          });

          try {
            await upsertChat({
              userId,
              chatId: currentChatId,
              title: updatedTitle,
              messages: updatedMessages,
            });
            
            finalUpdateSpan.end({
              output: {
                success: true,
                chatId: currentChatId,
                messageCount: updatedMessages.length,
                title: updatedTitle,
              },
            });
          } catch (error) {
            finalUpdateSpan.end({
              output: {
                success: false,
                error: error instanceof Error ? error.message : String(error),
              },
            });
            throw error;
          }

          // Flush the trace to Langfuse
          await langfuse.flushAsync();
        },
      });

      result.mergeIntoDataStream(dataStream);
    },
    onError: (e: unknown) => {
      console.error(e);
      return "Oops, an error occurred!";
    },
  });
}
