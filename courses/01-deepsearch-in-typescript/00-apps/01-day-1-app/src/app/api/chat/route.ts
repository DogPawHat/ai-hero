import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { appendResponseMessages } from "ai";
import { z } from "zod";
import { model } from "~/model";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { upsertChat } from "~/server/db/chat-helpers";

export const maxDuration = 60;

export async function POST(request: Request) {
  // Check if user is authenticated
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as {
    messages: Array<Message>;
    chatId?: string;
  };

  const { messages, chatId } = body;
  const userId = session.user.id;

  // Generate a chat ID if not provided
  const currentChatId = chatId || crypto.randomUUID();
  
  // Create or update the chat with the current messages before streaming
  // This ensures the chat exists even if the stream fails or is cancelled
  const title = messages[messages.length - 1]?.content?.toString().slice(0, 50) || "New Chat";
  await upsertChat({
    userId,
    chatId: currentChatId,
    title,
    messages,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat (no chatId provided), send the new chat ID to the frontend
      if (!chatId) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }

      const result = streamText({
        model,
        messages,
        system: `You are a helpful AI assistant that can search the web to provide accurate and up-to-date information.

When a user asks a question, you should:
1. Always use the searchWeb tool to find relevant information
2. Provide comprehensive answers based on the search results
3. Always cite your sources with inline markdown links in your responses
4. Be thorough in your research - search multiple times if needed to get complete information

IMPORTANT: Always format URLs as proper markdown links and organize sources properly:
- Use the publication title as the link text when possible
- Never display raw URLs - always wrap them in markdown link format
- Include multiple citations throughout your response, not just at the end
- At the end of your response, list all sources in this exact markdown format:

Sources:
[publication title 1](url1)
[publication title 2](url2)
[publication title 3](url3)
...etc.

Each source SHOULD be on its own newline under the "Sources:" heading.

Always prioritize using the search tool to provide the most current and accurate information possible.`,
        tools: {
          searchWeb: {
            parameters: z.object({
              query: z.string().describe("The query to search the web for"),
            }),
            execute: async ({ query }, { abortSignal }) => {
              const results = await searchSerper(
                { q: query, num: 10 },
                abortSignal,
              );

              return results.organic.map((result) => ({
                title: result.title,
                link: result.link,
                snippet: result.snippet,
              }));
            },
          },
        },
        maxSteps: 10,
        onFinish: async ({ response }) => {
          const responseMessages = response.messages;
          
          // Merge the response messages with the existing messages
          const updatedMessages = appendResponseMessages({
            messages,
            responseMessages,
          });

          // Update the chat with the complete message history
          const updatedTitle = updatedMessages[updatedMessages.length - 1]?.content?.toString().slice(0, 50) || title;
          await upsertChat({
            userId,
            chatId: currentChatId,
            title: updatedTitle,
            messages: updatedMessages,
          });
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
