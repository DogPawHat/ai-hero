import type { Message } from "ai";
import { createDataStreamResponse } from "ai";
import { appendResponseMessages } from "ai";
import { streamFromDeepSearch } from "~/deep-search";
import { auth } from "~/server/auth";
import { upsertChat } from "~/server/db/chat-helpers";
import { checkRateLimit, recordRateLimit } from "~/server/redis/rate-limit";
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

  // Configure rate limiting for LLM calls
  const rateLimitConfig = {
    maxRequests: 1,
    maxRetries: 3,
    windowMs: 20_000, // 20 seconds window
    keyPrefix: "global_llm",
  };

  // Check rate limit before processing the request
  const rateLimitCheck = await checkRateLimit(rateLimitConfig);

  if (!rateLimitCheck.allowed) {
    console.log("Rate limit exceeded, waiting for reset...");
    const isAllowed = await rateLimitCheck.retry();

    if (!isAllowed) {
      return new Response("Rate limit exceeded", {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "20", // 20 seconds
        },
      });
    }
  }

  // Record the successful request
  await recordRateLimit(rateLimitConfig);

  // Create a trace with user and session data
  const trace = langfuse.trace({
    sessionId: chatId,
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
      chatId,
      title,
      messageCount: messages.length,
      isNewChat: !messages.some((m) => m.role === "assistant"),
      isAdmin: rateLimitCheck.isAdmin,
    },
  });

  try {
    await upsertChat({
      userId,
      chatId,
      title,
      messages,
    });

    dbSpan.end({
      output: {
        success: true,
        chatId,
        messageCount: messages.length,
        isAdmin: rateLimitCheck.isAdmin,
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
          chatId,
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
              chatId,
              messageCount: updatedMessages.length,
              titleLength: updatedTitle.length,
            },
          });

          try {
            await upsertChat({
              userId,
              chatId,
              title: updatedTitle,
              messages: updatedMessages,
            });

            finalUpdateSpan.end({
              output: {
                success: true,
                chatId,
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
