import { SystemContext } from "~/system-context";
import { getNextAction } from "~/next-action";
import { searchSerper } from "~/serper";
import { bulkCrawlWebsites } from "~/server/scraper";
import { answerQuestion } from "~/answer-question";

// Reuse the searchWeb function from deep-search.ts
async function searchWeb(query: string) {
  const results = await searchSerper({ q: query, num: 10 }, undefined);

  return results.organic.map((result) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    date: result.date || "",
  }));
}

// Reuse the scrapeUrl function from deep-search.ts
async function scrapeUrl(urls: string[]) {
  const results = await bulkCrawlWebsites({ urls });

  if (!results.success) {
    throw new Error(`Failed to scrape URLs: ${results.error}`);
  }

  return results.results.map(({ url, result }) => ({
    url,
    result: result.data,
  }));
}

export async function runAgentLoop(userQuery: string) {
  // A persistent container for the state of our system
  const ctx = new SystemContext(userQuery);

  // A loop that continues until we have an answer
  // or we've taken 10 actions
  while (ctx.step < 10 && !ctx.shouldStop()) {
    console.log(`Step ${ctx.step + 1}: Determining next action...`);

    // We choose the next action based on the state of our system
    const nextAction = await getNextAction(ctx);
    console.log(`Next action: ${nextAction.type}`);

    // We execute the action and update the state of our system
    if (nextAction.type === "search") {
      console.log(`Searching for: ${nextAction.query}`);
      const searchResults = await searchWeb(nextAction.query);
      ctx.reportQueries([
        {
          query: nextAction.query,
          results: searchResults,
        },
      ]);
    } else if (nextAction.type === "scrape") {
      console.log(`Scraping URLs: ${nextAction.urls.join(", ")}`);
      const scrapeResults = await scrapeUrl(nextAction.urls);

      ctx.reportScrapes(scrapeResults);
    } else if (nextAction.type === "answer") {
      console.log("Answering question...");
      const answer = await answerQuestion(ctx, { isFinal: false });
      return answer;
    }

    ctx.incrementStep();
  }

  // If we've taken 10 actions and still don't have an answer,
  // we ask the LLM to give its best attempt at an answer
  console.log("Max steps reached, providing final answer...");
  return await answerQuestion(ctx, { isFinal: true });
}
