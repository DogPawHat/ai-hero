import type { Message } from "ai";

export const ciData: { input: Message[]; expected: string }[] = [
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
