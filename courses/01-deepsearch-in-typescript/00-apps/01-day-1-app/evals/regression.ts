import type { Message } from "ai";

export const regressionData: { input: Message[]; expected: string }[] = [
  {
    input: [
      {
        id: "7",
        role: "user",
        content: "How do I set up ESLint with TypeScript in a new project?",
      },
    ],
    expected: `To set up ESLint with TypeScript:
1. Install dependencies: npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
2. Create .eslintrc.js with TypeScript parser and plugin configuration
3. Add scripts to package.json for linting
4. Configure rules for TypeScript-specific linting
5. Optionally add Prettier integration for code formatting`,
  },
  {
    input: [
      {
        id: "8",
        role: "user",
        content: "What's the difference between SSR and SSG in Next.js?",
      },
    ],
    expected: `SSR (Server-Side Rendering) generates pages on each request at runtime, while SSG (Static Site Generation) pre-generates pages at build time. SSR is better for dynamic content that changes frequently, while SSG is ideal for content that doesn't change often and provides better performance and SEO.`,
  },
  {
    input: [
      {
        id: "9",
        role: "user",
        content: "How do I implement authentication with NextAuth.js?",
      },
    ],
    expected: `To implement authentication with NextAuth.js:
1. Install next-auth
2. Create [...nextauth].js API route
3. Configure providers (Google, GitHub, etc.)
4. Set up session provider in _app.js
5. Use useSession hook in components
6. Add authentication middleware for protected routes`,
  },
  {
    input: [
      {
        id: "10",
        role: "user",
        content: "What are React Server Components and how do they work?",
      },
    ],
    expected: `React Server Components are components that render on the server and send their output to the client. They enable better performance by reducing bundle size, allow direct database access, and improve SEO. They work alongside Client Components and can't use browser-only APIs or state.`,
  },
  {
    input: [
      {
        id: "11",
        role: "user",
        content: "How do I optimize images in Next.js?",
      },
    ],
    expected: `Use Next.js Image component which provides automatic optimization, lazy loading, responsive images, and modern formats like WebP. Configure domains in next.config.js for external images and use priority prop for above-the-fold images.`,
  },
];
