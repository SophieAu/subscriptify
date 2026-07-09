import clerk from "@clerk/astro";
import svelte from "@astrojs/svelte";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [clerk(), svelte()],
  // /login → dist/login.html, served by the Hono app
  build: { format: "file" },
  vite: {
    // single .env.local at the repo root; only PUBLIC_* vars are exposed
    envDir: "..",
    server: {
      proxy: { "/api": "http://localhost:8000" },
    },
  },
});
