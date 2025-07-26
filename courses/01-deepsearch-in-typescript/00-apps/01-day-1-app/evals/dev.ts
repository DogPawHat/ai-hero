import type { Message } from "ai";

export const devData: { input: Message[]; expected: string }[] = [
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
];
