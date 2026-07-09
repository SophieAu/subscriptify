import svelte from "@astrojs/svelte";
import clerk from "@clerk/astro";
import { defineConfig } from "astro/config";

export default defineConfig({
  integrations: [clerk(), svelte()],
  // /sign-in → dist/sign-in.html, served by the Hono app
  build: { format: "file" },
  vite: {
    envDir: "..", // single .env.local at the repo root; only PUBLIC_* vars are exposed
    server: {
      proxy: { "/api": "http://localhost:8000" },
    },
  },
});
