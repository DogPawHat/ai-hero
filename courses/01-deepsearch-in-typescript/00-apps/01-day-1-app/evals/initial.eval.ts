import { evalite } from "evalite";
import type { Message } from "ai";
import { z } from "zod";
import { generateObject } from "ai";
import { createScorer } from "evalite";

import { askDeepSearch } from "~/deep-search";
import { factualityModel } from "~/model";

// Factuality check implementation
export const checkFactuality = async (opts: {
  question: string;
  groundTruth: string;
  submission: string;
}) => {
  const { object } = await generateObject({
    model: factualityModel,
    prompt: `
      You are comparing a submitted answer to an expert answer on a given question. Here is the data:
      [BEGIN DATA]
      ************
      [Question]: ${opts.question}
      ************
      [Expert]: ${opts.groundTruth}
      ************
      [Submission]: ${opts.submission}
      ************
      [END DATA]

      Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
      The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
      (A) The submitted answer is a subset of the expert answer and is fully consistent with it.
      (B) The submitted answer is a superset of the expert answer and is fully consistent with it.
      (C) The submitted answer contains all the same details as the expert answer.
      (D) There is a disagreement between the submitted answer and the expert answer.
      (E) The answers differ, but these differences don't matter from the perspective of factuality.
    `,
    schema: z.object({
      answer: z.enum(["A", "B", "C", "D", "E"]).describe("Your selection."),
      rationale: z
        .string()
        .describe("Why you chose this answer. Be very detailed."),
    }),
  });

  const scores = {
    A: 0.4,
    B: 0.6,
    C: 1,
    D: 0,
    E: 1,
  };

  return {
    score: scores[object.answer],
    metadata: {
      rationale: object.rationale,
    },
  };
};

export const Factuality = createScorer<Message[], string, string>({
  name: "Factuality",
  scorer: async ({ input, expected, output }) => {
    // Extract question from first message content
    const question = input[0]?.content || "";
    return checkFactuality({
      question: input[0]?.content || "",
      groundTruth: expected!,
      submission: output,
    });
  },
});

// Evaluation definition
evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[]; expected: string }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content: "What is the latest version of TypeScript?",
          },
        ],
        expected: "The current TypeScript version is 5.8",
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content: "What are the main features of Next.js 15?",
          },
        ],
        expected: `
1. @next/codemod CLI: Easily upgrade to the latest Next.js and React versions.
2. Async Request APIs (Breaking): Incremental step towards a simplified rendering and caching model.
3. Caching Semantics (Breaking): fetch requests, GET Route Handlers, and client navigations are no longer cached by default.
4. React 19 Support: Support for React 19, React Compiler (Experimental), and hydration error improvements.
5. Turbopack Dev (Stable): Performance and stability improvements.
6. Static Indicator: New visual indicator shows static routes during development.
7. unstable_after API (Experimental): Execute code after a response finishes streaming.
8. instrumentation.js API (Stable): New API for server lifecycle observability.
9. Enhanced Forms (next/form): Enhance HTML forms with client-side navigation.
10. next.config: TypeScript support for next.config.ts.
11. Self-hosting Improvements: More control over Cache-Control headers.
12. Server Actions Security: Unguessable endpoints and removal of unused actions.
13. Bundling External Packages (Stable): New config options for App and Pages Router.
14. ESLint 9 Support: Added support for ESLint 9.
15. Development and Build Performance: Improved build times and Faster Fast Refresh.
`,
      },
    ];
  },
  task: async (input: Message[]) => {
    return askDeepSearch(input);
  },
  scorers: [
    Factuality,
    {
      name: "Contains Links",
      description: "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
  ],
});
