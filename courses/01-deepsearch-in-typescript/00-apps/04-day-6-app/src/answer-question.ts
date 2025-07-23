import { generateText } from "ai";
import { model } from "~/model";
import type { SystemContext } from "~/system-context";

export async function answerQuestion(
  context: SystemContext,
  options: { isFinal: boolean } = { isFinal: false },
): Promise<string> {
  const baseSystemPrompt = `You are a helpful AI assistant that needs to answer the user's question based on the research you've conducted.

You have access to web search and scraping capabilities, and have gathered information to answer the question. Please provide a comprehensive and accurate answer based on the research you've conducted.

Format your response clearly and include relevant sources using markdown links.`;

  const finalAddition = options.isFinal
    ? `

You have completed your research. However, you may not have all the information needed to fully answer the question. In this case, you should provide your best attempt at an answer based on the information you have gathered.

If there are gaps in your knowledge, acknowledge them and explain what you were able to find.`
    : "";

  const question = `Based on the following research and context, please answer the user's question:

${context.getQueryHistory()}

${context.getScrapeHistory()}

`;

  const systemPrompt = baseSystemPrompt + finalAddition + question;

  const result = await generateText({
    model,
    system: systemPrompt,
  });

  return result.text;
}
