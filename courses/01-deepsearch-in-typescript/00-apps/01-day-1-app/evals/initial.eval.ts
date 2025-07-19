import { evalite } from "evalite";
import { askDeepSearch } from "~/deep-search";
import type { Message } from "ai";

evalite("Deep Search Eval", {
  data: async (): Promise<{ input: Message[] }[]> => {
    return [
      {
        input: [
          {
            id: "1",
            role: "user",
            content:
              "What is the latest version of TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "2",
            role: "user",
            content:
              "What are the main features of Next.js 15?",
          },
        ],
      },
      {
        input: [
          {
            id: "3",
            role: "user",
            content:
              "How do I set up a React project with TypeScript?",
          },
        ],
      },
      {
        input: [
          {
            id: "4",
            role: "user",
            content:
              "What are the differences between Node.js and Deno?",
          },
        ],
      },
      {
        input: [
          {
            id: "5",
            role: "user",
            content:
              "How does the new React Compiler work?",
          },
        ],
      },
    ];
  },
  task: async (input) => {
    return askDeepSearch(input);
  },
  scorers: [
    {
      name: "Contains Links",
      description:
        "Checks if the output contains any markdown links.",
      scorer: ({ output }) => {
        const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const containsLinks = markdownLinkRegex.test(output);
        return containsLinks ? 1 : 0;
      },
    },
  ],
});