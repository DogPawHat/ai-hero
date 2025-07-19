import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { appendResponseMessages } from "ai";
import { z } from "zod";
import { model } from "~/model";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
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
  await upsertChat({
    userId,
    chatId: currentChatId,
    title,
    messages,
  });

  return createDataStreamResponse({
    execute: async (dataStream) => {
      // If this is a new chat (isNewChat is true), send the new chat ID to the frontend
      if (isNewChat) {
        dataStream.writeData({
          type: "NEW_CHAT_CREATED",
          chatId: currentChatId,
        });
      }

      const result = streamText({
        model,
        messages,
        experimental_telemetry: {
          isEnabled: true,
          functionId: "agent",
          metadata: {
            langfuseTraceId: trace.id,
          },
        },
        system: `You are a helpful AI assistant that can search the web and scrape websites to provide accurate and up-to-date information.

## Current Date and Time
The current date and time is ${new Date().toLocaleString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        })}.

## Available Tools (ALWAYS use these in order):

1. **searchWeb** - Use this tool FIRST to search the web for relevant information
2. **scrapePages** - Use this tool SECOND to extract full content from specific URLs found in search results

## CRITICAL INSTRUCTIONS:
- **ALWAYS use the scrapePages tool** for every query to get comprehensive, detailed content
- **Scrape 4-6 URLs per query** to ensure comprehensive coverage
- **Use a diverse set of sources** - include different types of websites (news, academic, blogs, official docs, forums, etc.)
- **Prioritize RECENT sources** when users ask for "up-to-date", "latest", or "current" information
- **Check publication dates** and mention them in your responses
- Never skip using scrapePages - it's essential for providing complete answers
- Use numbered list format when presenting tools and their purposes

## Workflow:
1. **Step 1**: Use searchWeb to find relevant URLs
2. **Step 2**: **ALWAYS use scrapePages** to extract full content from **4-6 diverse URLs** found
3. **Step 3**: Provide comprehensive answers based on both search results AND scraped content
4. **Step 4**: Always cite sources with inline markdown links and include publication dates

## Source Diversity Guidelines:
- Include **at least 4-6 different sources** per query
- Mix source types: news articles, official documentation, academic papers, expert blogs, forums, government sites
- Prioritize authoritative sources (.gov, .edu, established news organizations)
- **For time-sensitive queries**: prioritize sources from the last 24-48 hours
- Include both recent and established sources for comprehensive context

## Formatting Requirements:
- Use publication titles as link text
- Never display raw URLs - always use markdown link format
- **Include publication dates** when available: [publication title](url) (Published: date)
- Include multiple citations throughout response
- List the most relevant sources at end in this format:

Sources:
[publication title 1](url1) (Published: date1)
[publication title 2](url2) (Published: date2)
[publication title 3](url3) (Published: date3)
`,
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
                date: result.date,
              }));
            },
          },
          scrapePages: {
            parameters: z.object({
              urls: z
                .array(z.string())
                .describe("The URLs to scrape for full content"),
            }),
            execute: async ({ urls }, { abortSignal }) => {
              const results = await bulkCrawlWebsites({
                urls,
                maxRetries: 3,
              });

              if (results.success) {
                return results.results.map(({ url, result }) => ({
                  url,
                  content: result.data,
                }));
              } else {
                return {
                  error: results.error,
                  partialResults: results.results.map(({ url, result }) => ({
                    url,
                    success: result.success,
                    content: result.success ? result.data : result.error,
                  })),
                };
              }
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
          const updatedTitle =
            updatedMessages[updatedMessages.length - 1]?.content
              ?.toString()
              .slice(0, 50) || title;
          await upsertChat({
            userId,
            chatId: currentChatId,
            title: updatedTitle,
            messages: updatedMessages,
          });

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
