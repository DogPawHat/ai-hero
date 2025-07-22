import { z } from "zod";
import { generateObject } from "ai";
import { model } from "~/model";
import type { SystemContext } from "~/system-context";

// Action types
export interface SearchAction {
  type: "search";
  query: string;
}

export interface ScrapeAction {
  type: "scrape";
  urls: string[];
}

export interface AnswerAction {
  type: "answer";
}

export type Action = SearchAction | ScrapeAction | AnswerAction;

// Schema for structured outputs
export const actionSchema = z.object({
  type: z.enum(["search", "scrape", "answer"]).describe(
    `The type of action to take.
      - 'search': Search the web for more information.
      - 'scrape': Scrape a URL.
      - 'answer': Answer the user's question and complete the loop.`,
  ),
  query: z
    .string()
    .describe("The query to search for. Required if type is 'search'.")
    .optional(),
  urls: z
    .array(z.string())
    .describe("The URLs to scrape. Required if type is 'scrape'.")
    .optional(),
});

export const getNextAction = async (
  context: SystemContext,
): Promise<Action> => {
  const result = await generateObject({
    model,
    schema: actionSchema,
    system: `
You are a helpful AI assistant that needs to decide the next best action to take in order to answer the user's question.

You have access to three possible actions:
1. **search**: Search the web for more information
2. **scrape**: Scrape specific URLs to get detailed content
3. **answer**: Provide a final answer to the user

Based on this context, decide which action to take next. Consider:
- If you need more information, use 'search'
- If you have URLs from search results that need detailed content, use 'scrape'
- If you have enough information to answer the question, use 'answer'

Choose the most appropriate action and provide the required parameters.

Here is the context of what has happened so far:

${context.getQueryHistory()}

${context.getScrapeHistory()}
`,
  });

  const action = result.object;

  // Ensure the action has the correct type based on the schema
  if (action.type === "search" && !action.query) {
    throw new Error("Search action requires a query parameter");
  }

  if (action.type === "scrape" && (!action.urls || action.urls.length === 0)) {
    throw new Error("Scrape action requires URLs parameter");
  }

  return action as Action;
};
