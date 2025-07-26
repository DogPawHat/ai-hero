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
evalite("Web Dev Eval", {
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
            content: "How do I create a new React app with Typescript?",
          },
        ],
        expected: `It should recommend a tool such as create-next-app or create-tsrouter-app to create a new React app with TypeScript. It SHOULD NOT recommend create-react-app as it is deprecated.`,
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content: "What are the main features of NextJS 15?",
          },
        ],
        expected: `
1. @next/codemod CLI for easy upgrades.
2. Async Request APIs (breaking change).
3. Caching semantics changes: fetch, GET Route Handlers, and client navigations are no longer cached by default.
4. React 19 support and React Compiler (experimental).
5. Turbopack Dev (stable) with performance improvements.
6. Static indicator for static routes in development.
7. unstable_after API (experimental) for post-streaming code execution.
8. instrumentation.js API (stable) for server lifecycle observability.
9. Enhanced forms (next/form) for client-side navigation.
10. TypeScript support for next.config.ts.
11. Self-hosting improvements and more control over Cache-Control headers.
12. Server Actions security improvements.
13. Bundling external packages (stable) with new config options.
14. ESLint 9 support.
15. Improved development and build performance.
`,
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "Help me set up a nx monorepo with a rails backend and a svelte frontend",
          },
        ],
        expected: `To set up a Nx monorepo with a Rails backend and a Svelte frontend:
1. Install Nx: npx create-nx-workspace@latest my-monorepo
2. Add Rails: Create a new Rails app inside the monorepo (e.g., in apps/api) using rails new apps/api --api.
3. Add Svelte: Use Nx plugin for Svelte or add a Svelte app manually in apps/web.
4. Configure Nx workspace.json/project.json to include both apps.
5. Use Nx run and Nx serve to manage both apps from the monorepo.
6. Optionally, set up shared libraries for code sharing.
Refer to the Nx documentation and plugins for more details.`,
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "What new features does React Router 7 have over Remix v2 and React Router 6?",
          },
        ],
        expected: `React Router 7 introduces:
- Improved data APIs and loader patterns.
- Enhanced route layouts and nested routing.
- Better integration with React Suspense and async data.
- More ergonomic APIs for route definitions.
- Improved error handling and boundary support.
Compared to Remix v2 and React Router 6, React Router 7 focuses on improved data loading, nested layouts, and developer ergonomics.`,
      },
      {
        input: [
          {
            id: "6",
            role: "user",
            content: "What is the the current version of Remix?",
          },
        ],
        expected: `The current version of Remix is 2.17.0, released on July 25, 2025.

        React Router 7 is the successor to Remix v2 for React users.
        Remix v3 is being developed as a new JavaScript framework and is aimed specifically at new applications.
        Remix v2 is in maintenance mode.
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
