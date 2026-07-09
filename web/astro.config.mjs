import svelte from "@astrojs/svelte";
import clerk from "@clerk/astro";
import { defineConfig } from "astro/config";

console.log("PUBLIC_CLERK_PUBLISHABLE_KEY visible to build:", Boolean(process.env.PUBLIC_CLERK_PUBLISHABLE_KEY));

export default defineConfig({
  integrations: [clerk(), svelte()],
  vite: {
    envDir: "..", // single .env.local at the repo root;
    server: {
      proxy: { "/api": "http://localhost:8000" },
    },
  },
});
